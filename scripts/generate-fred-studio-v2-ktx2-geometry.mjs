import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const toolRoot = '/private/tmp/fred-studio-v2-opt-tools/node_modules'
const { NodeIO } = await import(`${toolRoot}/@gltf-transform/core/dist/index.js`)
const { ALL_EXTENSIONS } = await import(`${toolRoot}/@gltf-transform/extensions/dist/index.js`)
const { cloneDocument, getBounds, prune, simplifyPrimitive, weld } = await import(`${toolRoot}/@gltf-transform/functions/dist/index.js`)
const { MeshoptSimplifier } = await import(`${toolRoot}/meshoptimizer/meshopt_simplifier.module.js`)
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDir = path.join(rootDir, 'public/models/fred-studio-v2/optimised/ktx2')
const manifestPath = path.join(rootDir, 'generated/fred-studio-v2-optimisation/manifests/ktx2-geometry-derivatives.json')
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)

const guitarRatios = {
  conservative: { bodyDetail: 0.68, neck: 0.88, strings: 0.72, bottom: 0.9, fretboard: 0.95, cable: 0.95 },
  light: { bodyDetail: 0.52, neck: 0.78, strings: 0.6, bottom: 0.82, fretboard: 0.9, cable: 0.88 },
  moderate: { bodyDetail: 0.4, neck: 0.68, strings: 0.48, bottom: 0.72, fretboard: 0.85, cable: 0.78 },
}
const marshallRatios = {
  conservative: { bodyMain: 0.95, panelMain: 0.92, accessory: 0.88, bodyOther: 0.97, hardware: 0.98 },
  light: { bodyMain: 0.88, panelMain: 0.82, accessory: 0.72, bodyOther: 0.92, hardware: 0.94 },
}

function ratioFor(asset, level, meshName) {
  if (asset === 'guitar') {
    const ratios = guitarRatios[level]
    if (meshName.includes('Body Detail')) return ratios.bodyDetail
    if (meshName.includes('_Neck_')) return ratios.neck
    if (meshName.includes('_Strings_')) return ratios.strings
    if (meshName.includes('Body_Bottom')) return ratios.bottom
    if (meshName.includes('FretBoard')) return ratios.fretboard
    if (meshName.includes('BezierCurve')) return ratios.cable
    return 1
  }
  const ratios = marshallRatios[level]
  if (meshName.startsWith('Cube.027_Marshall Amp Body')) return ratios.bodyMain
  if (meshName.includes('Marshall Amp Panel')) return ratios.panelMain
  if (meshName.includes('Material_0')) return ratios.accessory
  if (meshName.includes('Marshall Amp Body')) return ratios.bodyOther
  if (meshName.includes('Anis_0')) return ratios.hardware
  return 1
}

function triangleCount(document) {
  return document.getRoot().listMeshes().reduce((total, mesh) => total + mesh.listPrimitives().reduce(
    (sum, primitive) => sum + Math.floor(primitive.getIndices().getCount() / 3), 0,
  ), 0)
}

function boundsRecord(document) {
  const scene = document.getRoot().getDefaultScene() ?? document.getRoot().listScenes()[0]
  const bounds = getBounds(scene)
  return {
    min: bounds.min.map((value) => Number(value.toFixed(8))),
    max: bounds.max.map((value) => Number(value.toFixed(8))),
  }
}

async function createVariant(sourceDocument, asset, level, outputName) {
  const document = cloneDocument(sourceDocument)
  await document.transform(weld({ tolerance: 0.00001, toleranceNormal: 0.00001, toleranceTexcoord: 0.00001 }))
  const error = asset === 'guitar'
    ? { conservative: 0.002, light: 0.004, moderate: 0.007 }[level]
    : { conservative: 0.0015, light: 0.003 }[level]
  for (const mesh of document.getRoot().listMeshes()) {
    const ratio = ratioFor(asset, level, mesh.getName())
    const triangles = mesh.listPrimitives().reduce((sum, primitive) => sum + primitive.getIndices().getCount() / 3, 0)
    if (ratio < 1 && triangles > 500) {
      mesh.listPrimitives().forEach((primitive) => simplifyPrimitive(primitive, {
        simplifier: MeshoptSimplifier, ratio, error, lockBorder: true,
      }))
    }
  }
  await document.transform(prune({ keepAttributes: true, keepIndices: true }))
  const outputPath = path.join(outputDir, outputName)
  await io.write(outputPath, document)
  const data = await readFile(outputPath)
  return {
    asset,
    level,
    file: `public/models/fred-studio-v2/optimised/ktx2/${outputName}`,
    bytes: data.byteLength,
    sha256: createHash('sha256').update(data).digest('hex'),
    triangles: triangleCount(document),
    bounds: boundsRecord(document),
  }
}

await MeshoptSimplifier.ready
const marshallSource = await io.read(path.join(outputDir, 'marshall_amp_optimised_ktx2.glb'))
const guitarSource = await io.read(path.join(outputDir, 'gibson_guitar_optimised_ktx2.glb'))
const records = []
for (const level of ['conservative', 'light']) {
  records.push(await createVariant(marshallSource, 'marshall', level, `marshall_amp_${level}_ktx2.glb`))
}
for (const level of ['conservative', 'light', 'moderate']) {
  records.push(await createVariant(guitarSource, 'guitar', level, `gibson_guitar_${level}_ktx2.glb`))
}
await writeFile(manifestPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), records }, null, 2)}\n`)
console.log(JSON.stringify(records, null, 2))
