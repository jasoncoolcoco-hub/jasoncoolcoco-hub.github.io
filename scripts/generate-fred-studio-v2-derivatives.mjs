import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const toolRoot = process.env.FRED_V2_GLTF_TOOL_ROOT
  ?? '/private/tmp/fred-studio-v2-opt-tools/node_modules'
const { NodeIO } = await import(`${toolRoot}/@gltf-transform/core/dist/index.js`)
const { ALL_EXTENSIONS } = await import(`${toolRoot}/@gltf-transform/extensions/dist/index.js`)
const {
  cloneDocument,
  getBounds,
  prune,
  simplifyPrimitive,
  weld,
} = await import(`${toolRoot}/@gltf-transform/functions/dist/index.js`)
const { MeshoptSimplifier } = await import(`${toolRoot}/meshoptimizer/meshopt_simplifier.module.js`)

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = path.join(rootDir, 'public/models/fred-studio-v2/objects/marshall_amp.glb')
const publicDir = path.join(rootDir, 'public/models/fred-studio-v2/optimised')
const generatedDir = path.join(rootDir, 'generated/fred-studio-v2-optimisation')
const manifestDir = path.join(generatedDir, 'manifests')
const sourceAuditDir = path.join(generatedDir, 'source-audit')

await Promise.all([
  mkdir(publicDir, { recursive: true }),
  mkdir(manifestDir, { recursive: true }),
  mkdir(sourceAuditDir, { recursive: true }),
  mkdir(path.join(generatedDir, 'screenshots'), { recursive: true }),
  mkdir(path.join(generatedDir, 'textures-ktx2'), { recursive: true }),
  mkdir(path.join(generatedDir, 'meshopt'), { recursive: true }),
])

const sha256 = async (filePath) => createHash('sha256').update(await readFile(filePath)).digest('hex')
const byteSize = async (filePath) => (await readFile(filePath)).byteLength
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
const combined = await io.read(sourcePath)

function triangleCount(document) {
  return document.getRoot().listMeshes().reduce((total, mesh) => (
    total + mesh.listPrimitives().reduce((meshTotal, primitive) => {
      const indices = primitive.getIndices()
      const positions = primitive.getAttribute('POSITION')
      return meshTotal + Math.floor((indices?.getCount() ?? positions?.getCount() ?? 0) / 3)
    }, 0)
  ), 0)
}

function boundsRecord(document) {
  const scene = document.getRoot().getDefaultScene() ?? document.getRoot().listScenes()[0]
  const bounds = getBounds(scene)
  return {
    min: bounds.min.map((value) => Number(value.toFixed(8))),
    max: bounds.max.map((value) => Number(value.toFixed(8))),
    size: bounds.max.map((value, index) => Number((value - bounds.min[index]).toFixed(8))),
  }
}

function retainRootGroups(document, keepNames, stableId) {
  const keep = new Set(keepNames)
  const scene = document.getRoot().getDefaultScene() ?? document.getRoot().listScenes()[0]
  const rootNode = document.getRoot().listNodes().find((node) => node.getName() === 'RootNode')
  if (!rootNode) throw new Error('Combined source is missing RootNode.')
  rootNode.listChildren().forEach((node) => {
    if (!keep.has(node.getName())) node.dispose()
  })
  const wrapper = scene.listChildren()[0]
  wrapper.setName(stableId)
  wrapper.setExtras({ ...wrapper.getExtras(), studioV2Id: stableId })
  scene.setName(`${stableId}_SCENE`)
}

async function createSplitDocument(keepNames, stableId) {
  const document = cloneDocument(combined)
  retainRootGroups(document, keepNames, stableId)
  await document.transform(prune({ keepAttributes: true, keepIndices: true }))
  return document
}

function guitarRatio(meshName, level) {
  const ratios = {
    conservative: { bodyDetail: 0.68, neck: 0.88, strings: 0.72, bottom: 0.9, fretboard: 0.95, cable: 0.95 },
    light: { bodyDetail: 0.52, neck: 0.78, strings: 0.6, bottom: 0.82, fretboard: 0.9, cable: 0.88 },
    moderate: { bodyDetail: 0.4, neck: 0.68, strings: 0.48, bottom: 0.72, fretboard: 0.85, cable: 0.78 },
  }[level]
  if (meshName.includes('Body Detail')) return ratios.bodyDetail
  if (meshName.includes('_Neck_')) return ratios.neck
  if (meshName.includes('_Strings_')) return ratios.strings
  if (meshName.includes('Body_Bottom')) return ratios.bottom
  if (meshName.includes('FretBoard')) return ratios.fretboard
  if (meshName.includes('BezierCurve')) return ratios.cable
  return 1
}

function marshallRatio(meshName, level) {
  const ratios = {
    conservative: { bodyMain: 0.95, panelMain: 0.92, accessory: 0.88, bodyOther: 0.97, hardware: 0.98 },
    light: { bodyMain: 0.88, panelMain: 0.82, accessory: 0.72, bodyOther: 0.92, hardware: 0.94 },
  }[level]
  if (meshName.startsWith('Cube.027_Marshall Amp Body')) return ratios.bodyMain
  if (meshName.includes('Marshall Amp Panel')) return ratios.panelMain
  if (meshName.includes('Material_0')) return ratios.accessory
  if (meshName.includes('Marshall Amp Body')) return ratios.bodyOther
  if (meshName.includes('Anis_0')) return ratios.hardware
  return 1
}

async function simplifyByComponent(sourceDocument, asset, level) {
  const document = cloneDocument(sourceDocument)
  await MeshoptSimplifier.ready
  await document.transform(weld({ tolerance: 0.00001, toleranceNormal: 0.00001, toleranceTexcoord: 0.00001 }))
  const error = asset === 'guitar'
    ? { conservative: 0.002, light: 0.004, moderate: 0.007 }[level]
    : { conservative: 0.0015, light: 0.003 }[level]
  const componentResults = []
  for (const mesh of document.getRoot().listMeshes()) {
    const before = mesh.listPrimitives().reduce((total, primitive) => total + Math.floor(primitive.getIndices().getCount() / 3), 0)
    const ratio = asset === 'guitar' ? guitarRatio(mesh.getName(), level) : marshallRatio(mesh.getName(), level)
    if (ratio < 1 && before > 500) {
      mesh.listPrimitives().forEach((primitive) => simplifyPrimitive(primitive, {
        simplifier: MeshoptSimplifier,
        ratio,
        error,
        lockBorder: true,
      }))
    }
    const after = mesh.listPrimitives().reduce((total, primitive) => total + Math.floor(primitive.getIndices().getCount() / 3), 0)
    componentResults.push({ mesh: mesh.getName(), ratio, before, after, saved: before - after })
  }
  await document.transform(prune({ keepAttributes: true, keepIndices: true }))
  return { document, componentResults }
}

async function writeDerivative(document, fileName, metadata = {}) {
  const outputPath = path.join(publicDir, fileName)
  await io.write(outputPath, document)
  return {
    ...metadata,
    file: `public/models/fred-studio-v2/optimised/${fileName}`,
    bytes: await byteSize(outputPath),
    sha256: await sha256(outputPath),
    triangles: triangleCount(document),
    bounds: boundsRecord(document),
  }
}

const marshallSource = await createSplitDocument(['Cube.024', 'Cube.027'], 'MARSHALL_AMP')
const guitarSource = await createSplitDocument(
  ['Les_Paul_Body.001', 'Les_Paul_BodyCover.001', 'BezierCurve.001'],
  'GIBSON_GUITAR',
)

const records = []
records.push(await writeDerivative(marshallSource, 'marshall_amp_optimised.glb', {
  asset: 'marshall', level: 'source-split', strategy: 'Lossless hierarchy split only.',
}))
records.push(await writeDerivative(guitarSource, 'gibson_guitar_optimised.glb', {
  asset: 'guitar', level: 'source-split', strategy: 'Lossless hierarchy split only.',
}))

for (const level of ['conservative', 'light']) {
  const result = await simplifyByComponent(marshallSource, 'marshall', level)
  records.push(await writeDerivative(result.document, `marshall_amp_${level}.glb`, {
    asset: 'marshall', level, componentResults: result.componentResults,
    strategy: 'Component-weighted simplification; silhouette and named front materials receive higher retention.',
  }))
}

for (const level of ['conservative', 'light', 'moderate']) {
  const result = await simplifyByComponent(guitarSource, 'guitar', level)
  records.push(await writeDerivative(result.document, `gibson_guitar_${level}.glb`, {
    asset: 'guitar', level, componentResults: result.componentResults,
    strategy: 'Component-weighted simplification; body detail and strings are reduced before body/neck silhouettes.',
  }))
}

const sourceChecksum = await sha256(sourcePath)
const output = {
  generatedAt: new Date().toISOString(),
  toolchain: {
    gltfTransform: '4.4.2',
    meshoptimizer: '0.23.0',
    blender: null,
  },
  source: {
    file: 'public/models/fred-studio-v2/objects/marshall_amp.glb',
    bytes: await byteSize(sourcePath),
    sha256: sourceChecksum,
    triangles: triangleCount(combined),
    bounds: boundsRecord(combined),
  },
  derivatives: records,
}

await writeFile(path.join(manifestDir, 'geometry-derivatives.json'), `${JSON.stringify(output, null, 2)}\n`)
await writeFile(path.join(sourceAuditDir, 'source-checksums.json'), `${JSON.stringify({
  generatedAt: output.generatedAt,
  combinedMarshallGuitar: output.source,
}, null, 2)}\n`)
console.log(JSON.stringify(output, null, 2))
