import fs from 'node:fs'
import path from 'node:path'

const [inputPath, outputPath] = process.argv.slice(2)

if (!inputPath || !outputPath) {
  throw new Error('Usage: node scripts/generate-fred-studio-v2-clean-cork-board.mjs <source.glb> <clean.glb>')
}

const COMPONENTS = Object.freeze({
  5123: Object.freeze({ bytes: 2, read: 'readUInt16LE' }),
  5125: Object.freeze({ bytes: 4, read: 'readUInt32LE' }),
  5126: Object.freeze({ bytes: 4, read: 'readFloatLE' }),
})

const TYPE_COMPONENTS = Object.freeze({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 })

function parseGlb(filePath) {
  const buffer = fs.readFileSync(filePath)
  if (buffer.toString('ascii', 0, 4) !== 'glTF') throw new Error('Input is not a binary glTF file.')
  const jsonLength = buffer.readUInt32LE(12)
  const json = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength).replace(/\u0000+$/, ''))
  return { buffer, binaryOffset: 20 + jsonLength + 8, json }
}

function readAccessor(glb, accessorIndex) {
  const accessor = glb.json.accessors[accessorIndex]
  const view = glb.json.bufferViews[accessor.bufferView]
  const component = COMPONENTS[accessor.componentType]
  const components = TYPE_COMPONENTS[accessor.type]
  if (!component || !components) throw new Error(`Unsupported accessor ${accessorIndex}.`)
  const start = glb.binaryOffset + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0)
  const stride = view.byteStride ?? component.bytes * components
  return Array.from({ length: accessor.count }, (_, index) => {
    const itemOffset = start + index * stride
    const values = Array.from({ length: components }, (__, componentIndex) => (
      glb.buffer[component.read](itemOffset + componentIndex * component.bytes)
    ))
    return components === 1 ? values[0] : values
  })
}

function connectedComponents(indices, vertexCount, positions) {
  const parents = Int32Array.from({ length: vertexCount }, (_, index) => index)
  const find = (value) => {
    let current = value
    while (parents[current] !== current) {
      parents[current] = parents[parents[current]]
      current = parents[current]
    }
    return current
  }
  const union = (left, right) => {
    const leftRoot = find(left)
    const rightRoot = find(right)
    if (leftRoot !== rightRoot) parents[rightRoot] = leftRoot
  }
  for (let index = 0; index < indices.length; index += 3) {
    union(indices[index], indices[index + 1])
    union(indices[index], indices[index + 2])
  }
  const stats = new Map()
  indices.forEach((vertexIndex) => {
    const root = find(vertexIndex)
    if (!stats.has(root)) {
      stats.set(root, {
        max: [-Infinity, -Infinity, -Infinity],
        min: [Infinity, Infinity, Infinity],
        triangles: 0,
      })
    }
    const component = stats.get(root)
    positions[vertexIndex].forEach((value, axis) => {
      component.min[axis] = Math.min(component.min[axis], value)
      component.max[axis] = Math.max(component.max[axis], value)
    })
  })
  for (let index = 0; index < indices.length; index += 3) {
    stats.get(find(indices[index])).triangles += 1
  }
  stats.forEach((component) => {
    component.center = component.max.map((value, axis) => (value + component.min[axis]) / 2)
    component.size = component.max.map((value, axis) => value - component.min[axis])
  })
  return { find, stats }
}

function padded(buffer) {
  const padding = (4 - (buffer.length % 4)) % 4
  return padding === 0 ? buffer : Buffer.concat([buffer, Buffer.alloc(padding)])
}

function floatBuffer(values) {
  const buffer = Buffer.alloc(values.length * 4)
  values.forEach((value, index) => buffer.writeFloatLE(value, index * 4))
  return buffer
}

function uint16Buffer(values) {
  const buffer = Buffer.alloc(values.length * 2)
  values.forEach((value, index) => buffer.writeUInt16LE(value, index * 2))
  return buffer
}

function writeCleanBoard(input, output) {
  const glb = parseGlb(input)
  const primitive = glb.json.meshes[0].primitives[0]
  const positions = readAccessor(glb, primitive.attributes.POSITION)
  const normals = readAccessor(glb, primitive.attributes.NORMAL)
  const indices = readAccessor(glb, primitive.indices)
  const components = connectedComponents(indices, positions.length, positions)
  const structuralRoots = new Set([...components.stats]
    .filter(([, component]) => component.size[0] > 0.9 || component.size[1] > 0.45)
    .map(([root]) => root))
  const surfaceRoot = [...structuralRoots].find((root) => {
    const component = components.stats.get(root)
    return component.size[0] > 1.8 && component.size[1] > 0.8 && component.center[2] > 0.005
  })
  if (structuralRoots.size !== 14 || surfaceRoot === undefined) {
    throw new Error(`Unexpected board topology: ${structuralRoots.size} structural components.`)
  }

  const oldFrameIndices = []
  const oldSurfaceIndices = []
  for (let index = 0; index < indices.length; index += 3) {
    const root = components.find(indices[index])
    if (!structuralRoots.has(root)) continue
    const target = root === surfaceRoot ? oldSurfaceIndices : oldFrameIndices
    target.push(indices[index], indices[index + 1], indices[index + 2])
  }
  const usedVertices = [...new Set([...oldFrameIndices, ...oldSurfaceIndices])].sort((left, right) => left - right)
  const remap = new Map(usedVertices.map((oldIndex, newIndex) => [oldIndex, newIndex]))
  const frameIndices = oldFrameIndices.map((index) => remap.get(index))
  const surfaceIndices = oldSurfaceIndices.map((index) => remap.get(index))
  const compactPositions = usedVertices.flatMap((index) => positions[index])
  const compactNormals = usedVertices.flatMap((index) => normals[index])
  const positionMin = [0, 1, 2].map((axis) => Math.min(...usedVertices.map((index) => positions[index][axis])))
  const positionMax = [0, 1, 2].map((axis) => Math.max(...usedVertices.map((index) => positions[index][axis])))

  const binaryParts = []
  const bufferViews = []
  let byteOffset = 0
  const append = (data, target) => {
    const aligned = padded(data)
    bufferViews.push({ buffer: 0, byteLength: data.length, byteOffset, target })
    binaryParts.push(aligned)
    byteOffset += aligned.length
    return bufferViews.length - 1
  }
  const positionView = append(floatBuffer(compactPositions), 34962)
  const normalView = append(floatBuffer(compactNormals), 34962)
  const frameIndexView = append(uint16Buffer(frameIndices), 34963)
  const surfaceIndexView = append(uint16Buffer(surfaceIndices), 34963)
  const binary = Buffer.concat(binaryParts)

  const json = {
    asset: {
      extras: {
        author: glb.json.asset?.extras?.author,
        cleanup: 'Only the structural frame and blank board surface are retained. Source photos, notes, pins, and atlas textures are excluded.',
        license: glb.json.asset?.extras?.license,
        source: glb.json.asset?.extras?.source,
        sourceSha256: '831115794387ee7f91ebe0b7c69c2a8d1b5948a136bb06a2e1404365e719e4d4',
        title: 'Cork Board — clean structural derivative',
      },
      generator: 'Fred Studio V2 clean cork-board derivative generator',
      version: '2.0',
    },
    accessors: [
      { bufferView: positionView, componentType: 5126, count: usedVertices.length, max: positionMax, min: positionMin, type: 'VEC3' },
      { bufferView: normalView, componentType: 5126, count: usedVertices.length, type: 'VEC3' },
      { bufferView: frameIndexView, componentType: 5123, count: frameIndices.length, type: 'SCALAR' },
      { bufferView: surfaceIndexView, componentType: 5123, count: surfaceIndices.length, type: 'SCALAR' },
    ],
    buffers: [{ byteLength: binary.length }],
    bufferViews,
    materials: [
      {
        name: 'PHOTO_BOARD_FRAME_MATERIAL',
        pbrMetallicRoughness: { baseColorFactor: [0.19, 0.075, 0.025, 1], metallicFactor: 0, roughnessFactor: 0.72 },
      },
      {
        name: 'PHOTO_BOARD_SURFACE_MATERIAL',
        pbrMetallicRoughness: { baseColorFactor: [0.54, 0.31, 0.17, 1], metallicFactor: 0, roughnessFactor: 0.94 },
      },
    ],
    meshes: [
      { name: 'PHOTO_BOARD_FRAME_MESH', primitives: [{ attributes: { NORMAL: 1, POSITION: 0 }, indices: 2, material: 0 }] },
      { name: 'PHOTO_BOARD_SURFACE_MESH', primitives: [{ attributes: { NORMAL: 1, POSITION: 0 }, indices: 3, material: 1 }] },
    ],
    nodes: [
      { children: [1, 2], name: 'PHOTO_BOARD_01' },
      { mesh: 0, name: 'PHOTO_BOARD_FRAME' },
      { mesh: 1, name: 'PHOTO_BOARD_SURFACE' },
    ],
    scene: 0,
    scenes: [{ name: 'PHOTO_BOARD_CLEAN_SCENE', nodes: [0] }],
  }
  const jsonBuffer = padded(Buffer.from(JSON.stringify(json)))
  jsonBuffer.fill(0x20, Buffer.byteLength(JSON.stringify(json)))
  const outputBuffer = Buffer.alloc(12 + 8 + jsonBuffer.length + 8 + binary.length)
  outputBuffer.write('glTF', 0)
  outputBuffer.writeUInt32LE(2, 4)
  outputBuffer.writeUInt32LE(outputBuffer.length, 8)
  outputBuffer.writeUInt32LE(jsonBuffer.length, 12)
  outputBuffer.writeUInt32LE(0x4e4f534a, 16)
  jsonBuffer.copy(outputBuffer, 20)
  const binaryHeader = 20 + jsonBuffer.length
  outputBuffer.writeUInt32LE(binary.length, binaryHeader)
  outputBuffer.writeUInt32LE(0x004e4942, binaryHeader + 4)
  binary.copy(outputBuffer, binaryHeader + 8)
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, outputBuffer)

  const decorativeComponentsRemoved = components.stats.size - structuralRoots.size
  const sourceTriangles = indices.length / 3
  const retainedTriangles = (frameIndices.length + surfaceIndices.length) / 3
  console.log(JSON.stringify({
    decorativeComponentsRemoved,
    embeddedImages: 0,
    output,
    retainedStructuralComponents: structuralRoots.size,
    structuralComponentAudit: [...structuralRoots].map((root) => ({
      root,
      ...components.stats.get(root),
    })),
    retainedTriangles,
    sourceComponents: components.stats.size,
    sourceTriangles,
    usedVertices: usedVertices.length,
  }, null, 2))
}

writeCleanBoard(inputPath, outputPath)
