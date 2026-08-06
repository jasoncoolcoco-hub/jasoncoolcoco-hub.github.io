import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const run = promisify(execFile)
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cli = '/private/tmp/fred-studio-v2-opt-tools/node_modules/.bin/gltf-transform'
const modelRoot = path.join(rootDir, 'public/models/fred-studio-v2')
const outputRoot = path.join(modelRoot, 'optimised')
const manifestPath = path.join(rootDir, 'generated/fred-studio-v2-optimisation/manifests/meshopt-assets.json')
const pairs = [
  ['loft_interior_6_for_free.glb', 'meshopt/room_meshopt.glb'],
  ['objects/macbook_pro_2021.glb', 'meshopt/macbook_pro_2021_meshopt.glb'],
  ['optimised/marshall_amp_optimised.glb', 'meshopt/marshall_amp_optimised_meshopt.glb'],
  ['optimised/marshall_amp_conservative.glb', 'meshopt/marshall_amp_conservative_meshopt.glb'],
  ['optimised/marshall_amp_light.glb', 'meshopt/marshall_amp_light_meshopt.glb'],
  ['optimised/gibson_guitar_optimised.glb', 'meshopt/gibson_guitar_optimised_meshopt.glb'],
  ['optimised/gibson_guitar_conservative.glb', 'meshopt/gibson_guitar_conservative_meshopt.glb'],
  ['optimised/gibson_guitar_light.glb', 'meshopt/gibson_guitar_light_meshopt.glb'],
  ['optimised/gibson_guitar_moderate.glb', 'meshopt/gibson_guitar_moderate_meshopt.glb'],
  ['optimised/ktx2/room_ktx2.glb', 'ktx2-meshopt/room_ktx2_meshopt.glb'],
  ['optimised/ktx2/macbook_pro_2021_ktx2.glb', 'ktx2-meshopt/macbook_pro_2021_ktx2_meshopt.glb'],
  ['optimised/ktx2/marshall_amp_optimised_ktx2.glb', 'ktx2-meshopt/marshall_amp_optimised_ktx2_meshopt.glb'],
  ['optimised/ktx2/marshall_amp_conservative_ktx2.glb', 'ktx2-meshopt/marshall_amp_conservative_ktx2_meshopt.glb'],
  ['optimised/ktx2/marshall_amp_light_ktx2.glb', 'ktx2-meshopt/marshall_amp_light_ktx2_meshopt.glb'],
  ['optimised/ktx2/gibson_guitar_optimised_ktx2.glb', 'ktx2-meshopt/gibson_guitar_optimised_ktx2_meshopt.glb'],
  ['optimised/ktx2/gibson_guitar_conservative_ktx2.glb', 'ktx2-meshopt/gibson_guitar_conservative_ktx2_meshopt.glb'],
  ['optimised/ktx2/gibson_guitar_light_ktx2.glb', 'ktx2-meshopt/gibson_guitar_light_ktx2_meshopt.glb'],
  ['optimised/ktx2/gibson_guitar_moderate_ktx2.glb', 'ktx2-meshopt/gibson_guitar_moderate_ktx2_meshopt.glb'],
]

await Promise.all([
  mkdir(path.join(outputRoot, 'meshopt'), { recursive: true }),
  mkdir(path.join(outputRoot, 'ktx2-meshopt'), { recursive: true }),
])

const records = []
for (const [inputName, outputName] of pairs) {
  const inputPath = path.join(modelRoot, inputName)
  const outputPath = path.join(outputRoot, outputName)
  await run(cli, [
    'meshopt', inputPath, outputPath,
    '--level', 'high',
    '--quantization-volume', 'mesh',
    '--quantize-position', '14',
    '--quantize-normal', '10',
    '--quantize-texcoord', '12',
  ], { maxBuffer: 8 * 1024 * 1024 })
  const source = await readFile(inputPath)
  const derivative = await readFile(outputPath)
  records.push({
    source: path.relative(rootDir, inputPath),
    derivative: path.relative(rootDir, outputPath),
    sourceBytes: source.byteLength,
    derivativeBytes: derivative.byteLength,
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    derivativeSha256: createHash('sha256').update(derivative).digest('hex'),
  })
  console.log(`${inputName}: ${source.byteLength} -> ${derivative.byteLength}`)
}

await writeFile(manifestPath, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  encoder: 'glTF-Transform 4.4.2 + meshoptimizer 0.23.0',
  settings: {
    level: 'high',
    quantizationVolume: 'mesh',
    positionBits: 14,
    normalBits: 10,
    texcoordBits: 12,
  },
  records,
}, null, 2)}\n`)
