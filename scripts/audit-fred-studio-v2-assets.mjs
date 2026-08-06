import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const PROJECT_ROOT = process.cwd()
const ROOM_REMOVED_ROOTS = new Set([
  'Cube005',
  'Cube006',
  'node_0004',
  'node_0005',
  'Plane007',
  'Plane008',
  'Plane009',
  'Plane010',
  'Plane011',
])

const SOURCES = [
  {
    id: 'ROOM',
    file: 'public/models/fred-studio-v2/loft_interior_6_for_free.glb',
    categoryForPath: () => 'ROOM',
  },
  {
    id: 'MACBOOK',
    file: 'public/models/fred-studio-v2/objects/macbook_pro_2021.glb',
    categoryForPath: () => 'MACBOOK',
  },
  {
    id: 'MARSHALL_GUITAR',
    file: 'public/models/fred-studio-v2/objects/marshall_amp.glb',
    categoryForPath(nodePath) {
      if (/\/(Cube\.024|Cube\.027)(\/|$)/.test(nodePath)) return 'MARSHALL'
      if (/\/(Les_Paul_Body\.001|Les_Paul_BodyCover\.001|BezierCurve\.001)(\/|$)/.test(nodePath)) return 'GUITAR'
      return null
    },
  },
]

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

function parseGlb(file) {
  const buffer = fs.readFileSync(file)
  if (buffer.toString('ascii', 0, 4) !== 'glTF') throw new Error(`Not a GLB: ${file}`)
  const glbVersion = buffer.readUInt32LE(4)
  let json = null
  let binary = null
  let offset = 12
  while (offset < buffer.length) {
    const length = buffer.readUInt32LE(offset)
    const type = buffer.readUInt32LE(offset + 4)
    const chunk = buffer.subarray(offset + 8, offset + 8 + length)
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8').replace(/\0+$/g, ''))
    if (type === 0x004e4942) binary = chunk
    offset += length + 8
  }
  return { binary, buffer, glbVersion, json }
}

function jpegDimensions(buffer) {
  let offset = 2
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue }
    const marker = buffer[offset + 1]
    const length = buffer.readUInt16BE(offset + 2)
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) }
    }
    offset += 2 + length
  }
  return { height: null, width: null }
}

function imageDimensions(buffer, mimeType) {
  if (mimeType === 'image/png') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
  }
  if (mimeType === 'image/jpeg') return jpegDimensions(buffer)
  if (mimeType === 'image/ktx2') {
    return { width: buffer.readUInt32LE(20), height: buffer.readUInt32LE(24) }
  }
  return { height: null, width: null }
}

function textureSemantics(json) {
  const semantics = new Map()
  const add = (textureInfo, semantic, colorSpace) => {
    if (!textureInfo) return
    if (!semantics.has(textureInfo.index)) semantics.set(textureInfo.index, [])
    semantics.get(textureInfo.index).push({ colorSpace, semantic })
  }
  ;(json.materials || []).forEach((material) => {
    const pbr = material.pbrMetallicRoughness || {}
    add(pbr.baseColorTexture, 'baseColor', 'sRGB')
    add(pbr.metallicRoughnessTexture, 'metallicRoughness', 'NoColorSpace/data')
    add(material.normalTexture, 'normal', 'NoColorSpace/data')
    add(material.occlusionTexture, 'ambientOcclusion', 'NoColorSpace/data')
    add(material.emissiveTexture, 'emissive', 'sRGB')
    add(material.alphaTexture, 'alpha', 'NoColorSpace/data')
    add(material.extensions?.KHR_materials_specular?.specularTexture, 'specular', 'NoColorSpace/data')
    add(material.extensions?.KHR_materials_specular?.specularColorTexture, 'specularColor', 'sRGB')
  })
  return semantics
}

function buildNodeData(json) {
  const parent = new Map()
  ;(json.nodes || []).forEach((node, index) => {
    ;(node.children || []).forEach((child) => parent.set(child, index))
  })
  const nodePath = (index) => {
    const names = []
    let cursor = index
    while (cursor !== undefined) {
      names.unshift(json.nodes[cursor]?.name || `node_${cursor}`)
      cursor = parent.get(cursor)
    }
    return `/${names.join('/')}`
  }
  const removed = new Set()
  const markRemoved = (index) => {
    if (removed.has(index)) return
    removed.add(index)
    ;(json.nodes[index]?.children || []).forEach(markRemoved)
  }
  ;(json.nodes || []).forEach((node, index) => {
    if (ROOM_REMOVED_ROOTS.has(node.name)) markRemoved(index)
  })
  return { nodePath, parent, removed }
}

function accessorCount(json, accessorIndex) {
  return accessorIndex === undefined ? 0 : (json.accessors?.[accessorIndex]?.count || 0)
}

function primitiveTriangles(json, primitive) {
  if (primitive.mode !== undefined && primitive.mode !== 4) return 0
  const elementCount = primitive.indices !== undefined
    ? accessorCount(json, primitive.indices)
    : accessorCount(json, primitive.attributes?.POSITION)
  return elementCount / 3
}

function materialType(material) {
  return material?.extensions?.KHR_materials_specular ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'
}

function visibilityClassification(category, meshName) {
  if (category !== 'ROOM') return 'YES — placed asset visible in approved opening composition'
  if (/roof|ceiling|floor|wall|window|kitchen|sofa|table|carpet|carpet|cabinet|door/i.test(meshName)) {
    return 'YES/PARTIAL — major room surface in the approved composition'
  }
  return 'PARTIAL/UNCERTAIN — depends on opening-camera frustum and occlusion'
}

function silhouetteClassification(meshName, triangles) {
  const small = /string|knob|screw|port|key|hinge|label|handle|detail|anis|cable|bezier|fret/i.test(meshName)
  return small || triangles < 1000 ? 'SMALL DETAIL' : 'MAJOR SILHOUETTE/SURFACE'
}

function optimisationRisk(meshName, triangles) {
  const classification = silhouetteClassification(meshName, triangles)
  if (classification === 'SMALL DETAIL' && triangles > 5000) return 'LOW–MEDIUM — candidate for selective simplification'
  if (classification === 'SMALL DETAIL') return 'LOW — small visual contribution'
  if (triangles > 50000) return 'HIGH — silhouette or broad shading risk'
  return 'MEDIUM — visual comparison required'
}

function auditSource(source) {
  const absoluteFile = path.join(PROJECT_ROOT, source.file)
  const { binary, buffer, glbVersion, json } = parseGlb(absoluteFile)
  const { nodePath, removed } = buildNodeData(json)
  const semantics = textureSemantics(json)
  const images = (json.images || []).map((image, imageIndex) => {
    let bytes = null
    let storage = 'external'
    if (image.bufferView !== undefined) {
      const view = json.bufferViews[image.bufferView]
      const start = view.byteOffset || 0
      bytes = binary.subarray(start, start + view.byteLength)
      storage = 'embedded bufferView'
    }
    const dimensions = bytes ? imageDimensions(bytes, image.mimeType) : { height: null, width: null }
    return {
      byteSize: bytes?.length ?? null,
      decodedCpuBytesEstimate: dimensions.width && dimensions.height ? dimensions.width * dimensions.height * 4 : null,
      dimensions,
      format: image.mimeType || path.extname(image.uri || '').slice(1) || 'unknown',
      imageIndex,
      sha256: bytes ? sha256(bytes) : null,
      storage,
      uri: image.uri || null,
    }
  })
  const textures = (json.textures || []).map((texture, textureIndex) => {
    const imageIndex = texture.source ?? texture.extensions?.KHR_texture_basisu?.source
    const image = images[imageIndex]
    const baseBytes = image?.decodedCpuBytesEstimate
    return {
      baseGpuBytesEstimateRgba8: baseBytes,
      imageIndex,
      mipmappedGpuBytesEstimateRgba8: baseBytes ? Math.round(baseBytes * 1.33) : null,
      semantics: semantics.get(textureIndex) || [],
      textureIndex,
    }
  })

  const nodeRecords = []
  const categoryNodes = new Map()
  ;(json.nodes || []).forEach((node, nodeIndex) => {
    if (source.id === 'ROOM' && removed.has(nodeIndex)) return
    const currentPath = nodePath(nodeIndex)
    const category = source.categoryForPath(currentPath)
    if (!category) return
    if (!categoryNodes.has(category)) categoryNodes.set(category, new Set())
    categoryNodes.get(category).add(nodeIndex)
    if (node.mesh === undefined) return
    const mesh = json.meshes[node.mesh]
    ;(mesh.primitives || []).forEach((primitive, primitiveIndex) => {
      const triangles = primitiveTriangles(json, primitive)
      const material = json.materials?.[primitive.material]
      nodeRecords.push({
        asset: category,
        geometryKey: `${node.mesh}:${primitiveIndex}`,
        hasMorphTargets: Boolean(primitive.targets?.length),
        indexed: primitive.indices !== undefined,
        materialIndex: primitive.material ?? null,
        materialName: material?.name || 'UNNAMED',
        meshIndex: node.mesh,
        meshName: mesh.name || `mesh_${node.mesh}`,
        nodeIndex,
        nodeName: node.name || `node_${nodeIndex}`,
        nodePath: currentPath,
        positionVertices: accessorCount(json, primitive.attributes?.POSITION),
        primitiveIndex,
        triangles,
        visibilityFromOpening: visibilityClassification(category, node.name || mesh.name || ''),
        visualRole: silhouetteClassification(node.name || mesh.name || '', triangles),
        optimisationRisk: optimisationRisk(node.name || mesh.name || '', triangles),
      })
    })
  })

  const categories = {}
  for (const category of new Set(nodeRecords.map((record) => record.asset))) {
    const records = nodeRecords.filter((record) => record.asset === category)
    const uniqueGeometry = new Set(records.map((record) => record.geometryKey))
    const meshNodeIds = new Set(records.map((record) => record.nodeIndex))
    const materialIndices = new Set(records.map((record) => record.materialIndex).filter((value) => value !== null))
    const materialAssignments = records.map((record) => record.materialIndex).filter((value) => value !== null)
    const materialUsers = Object.fromEntries([...materialIndices].map((index) => [
      json.materials?.[index]?.name || `material_${index}`,
      materialAssignments.filter((value) => value === index).length,
    ]))
    const categoryTextureIndices = new Set()
    materialIndices.forEach((materialIndex) => {
      const material = json.materials?.[materialIndex] || {}
      const pbr = material.pbrMetallicRoughness || {}
      const references = [
        pbr.baseColorTexture,
        pbr.metallicRoughnessTexture,
        material.normalTexture,
        material.occlusionTexture,
        material.emissiveTexture,
        material.extensions?.KHR_materials_specular?.specularTexture,
        material.extensions?.KHR_materials_specular?.specularColorTexture,
      ]
      references.forEach((reference) => {
        if (reference?.index !== undefined) categoryTextureIndices.add(reference.index)
      })
    })
    const categoryTextures = [...categoryTextureIndices].map((index) => textures[index])
    const meshInstanceCount = new Map()
    records.forEach((record) => meshInstanceCount.set(record.meshIndex, (meshInstanceCount.get(record.meshIndex) || 0) + 1))
    const multiPrimitiveMeshes = [...meshNodeIds].map((nodeIndex) => ({
      nodeName: json.nodes[nodeIndex]?.name,
      primitiveCount: json.meshes[json.nodes[nodeIndex].mesh]?.primitives?.length || 0,
    })).filter((entry) => entry.primitiveCount > 1)
    categories[category] = {
      animations: (json.animations || []).length,
      bones: (json.skins || []).reduce((total, skin) => total + (skin.joints?.length || 0), 0),
      category,
      duplicatedGeometryInstances: [...meshInstanceCount.entries()]
        .filter(([, count]) => count > 1)
        .map(([meshIndex, count]) => ({ count, meshIndex, meshName: json.meshes[meshIndex]?.name })),
      estimatedMainPassDrawCalls: records.length,
      estimatedMainPlusOneShadowPassDrawCalls: records.length * 2,
      geometryGroups: multiPrimitiveMeshes,
      indexedGeometryCount: records.filter((record) => record.indexed).length,
      materialAssignmentCount: materialAssignments.length,
      materialTypes: Object.fromEntries([...materialIndices].map((index) => [
        json.materials[index]?.name || `material_${index}`,
        materialType(json.materials[index]),
      ])),
      materialsSharedAcrossMeshes: materialUsers,
      meshCount: meshNodeIds.size,
      meshesUsingMultiplePrimitives: multiPrimitiveMeshes.length,
      morphTargetPrimitiveCount: records.filter((record) => record.hasMorphTargets).length,
      nodeCount: categoryNodes.get(category)?.size || 0,
      nonIndexedGeometryCount: records.filter((record) => !record.indexed).length,
      primitiveCount: records.length,
      skinCount: (json.skins || []).length,
      skinnedMeshCount: [...meshNodeIds].filter((nodeIndex) => json.nodes[nodeIndex]?.skin !== undefined).length,
      textureCount: categoryTextures.length,
      textureGpuBytesEstimateRgba8Mipmapped: categoryTextures.reduce((total, texture) => total + (texture?.mipmappedGpuBytesEstimateRgba8 || 0), 0),
      textureIndices: [...categoryTextureIndices],
      triangleCount: records.reduce((total, record) => total + record.triangles, 0),
      uniqueGeometryCount: uniqueGeometry.size,
      uniqueMaterialCount: materialIndices.size,
      uniqueTextureCount: new Set(categoryTextures.map((texture) => texture?.imageIndex)).size,
      vertexCount: records.reduce((total, record) => total + record.positionVertices, 0),
      visibleMeshCount: meshNodeIds.size,
    }
  }

  return {
    assetFile: {
      assetVersion: json.asset?.version,
      byteSize: buffer.length,
      compression: {
        draco: (json.extensionsUsed || []).includes('KHR_draco_mesh_compression'),
        ktx2Basis: (json.extensionsUsed || []).includes('KHR_texture_basisu') || images.some((image) => image.format === 'image/ktx2'),
        meshopt: (json.extensionsUsed || []).includes('EXT_meshopt_compression'),
      },
      extensionsRequired: json.extensionsRequired || [],
      extensionsUsed: json.extensionsUsed || [],
      generator: json.asset?.generator || null,
      glbVersion,
      path: source.file,
      sha256: sha256(buffer),
      textureStorage: images.every((image) => image.storage === 'embedded bufferView') ? 'all embedded' : 'contains external textures',
    },
    categories,
    images,
    materials: (json.materials || []).map((material, materialIndex) => ({
      alphaMode: material.alphaMode || 'OPAQUE',
      doubleSided: Boolean(material.doubleSided),
      hasClearcoatExtension: Boolean(material.extensions?.KHR_materials_clearcoat),
      hasEmissiveMap: Boolean(material.emissiveTexture),
      materialIndex,
      name: material.name || `material_${materialIndex}`,
      type: materialType(material),
    })),
    nodeRecords,
    textures,
  }
}

const sourceAudits = SOURCES.map(auditSource)
const categoryMetrics = Object.assign({}, ...sourceAudits.map((source) => source.categories))
const completeStaticTriangles = Object.values(categoryMetrics).reduce((total, category) => total + category.triangleCount, 0)
const topMeshes = sourceAudits
  .flatMap((source) => source.nodeRecords)
  .sort((left, right) => right.triangles - left.triangles)
  .slice(0, 40)
  .map((record, index) => ({
    ...record,
    percentageOfCompleteStaticTriangles: Number(((record.triangles / completeStaticTriangles) * 100).toFixed(3)),
    rank: index + 1,
  }))

const duplicateImages = sourceAudits.flatMap((source) => source.images.map((image) => ({
  asset: source.assetFile.path,
  ...image,
}))).filter((image, index, all) => image.sha256 && all.some((other, otherIndex) => otherIndex !== index && other.sha256 === image.sha256))

const result = {
  assumptions: {
    completeStaticTriangles: 'Sum of audited final visible asset primitives before raster frustum/occlusion culling; excludes known removed room node subtrees.',
    gpuTextureMemory: 'RGBA8 estimate = width × height × 4; mipmapped estimate = base × 1.33. It is not an exact driver allocation.',
    shadowDrawCalls: 'Estimated with one shadow pass for meshes configured to cast shadows; runtime isolation data is authoritative for the approved camera.',
  },
  categoryMetrics,
  completeStaticTriangles,
  duplicateImages,
  generatedAt: new Date().toISOString(),
  sourceAudits: sourceAudits.map(({ nodeRecords, ...sourceAudit }) => sourceAudit),
  topMeshes,
}

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
