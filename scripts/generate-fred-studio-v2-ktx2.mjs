import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const run = promisify(execFile)
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cli = '/private/tmp/fred-studio-v2-opt-tools/node_modules/.bin/gltf-transform'
const toktxBin = '/private/tmp/fred-studio-v2-ktx/tools/usr/local/bin'
const publicDir = path.join(rootDir, 'public/models/fred-studio-v2/optimised/ktx2')
const workspaceDir = path.join(rootDir, 'generated/fred-studio-v2-optimisation/textures-ktx2')
const manifestDir = path.join(rootDir, 'generated/fred-studio-v2-optimisation/manifests')
const env = { ...process.env, PATH: `${toktxBin}:${process.env.PATH}` }

await Promise.all([
  mkdir(publicDir, { recursive: true }),
  mkdir(workspaceDir, { recursive: true }),
  mkdir(manifestDir, { recursive: true }),
])

const assets = [
  {
    id: 'room',
    input: 'public/models/fred-studio-v2/loft_interior_6_for_free.glb',
    output: 'room_ktx2.glb',
  },
  {
    id: 'macbook',
    input: 'public/models/fred-studio-v2/objects/macbook_pro_2021.glb',
    output: 'macbook_pro_2021_ktx2.glb',
  },
  {
    id: 'marshall-source-split',
    input: 'public/models/fred-studio-v2/optimised/marshall_amp_optimised.glb',
    output: 'marshall_amp_optimised_ktx2.glb',
  },
  {
    id: 'guitar-source-split',
    input: 'public/models/fred-studio-v2/optimised/gibson_guitar_optimised.glb',
    output: 'gibson_guitar_optimised_ktx2.glb',
  },
]

const dataSlots = '{normalTexture,metallicRoughnessTexture,occlusionTexture,specularTexture,specularColorTexture}'
const colourSlots = '{baseColorTexture,emissiveTexture}'
const sha256 = async (filePath) => createHash('sha256').update(await readFile(filePath)).digest('hex')
const records = []

for (const asset of assets) {
  const inputPath = path.join(rootDir, asset.input)
  const intermediatePath = path.join(workspaceDir, `${asset.id}-data.glb`)
  const outputPath = path.join(publicDir, asset.output)
  const hasIntermediate = await access(intermediatePath).then(() => true, () => false)
  const dataLevel = hasIntermediate ? 4 : 3
  if (!hasIntermediate) {
    await run(cli, [
      'uastc', inputPath, intermediatePath,
      '--slots', dataSlots,
      '--level', String(dataLevel),
      '--zstd', '18',
      '--jobs', '4',
    ], { env, maxBuffer: 8 * 1024 * 1024 })
  }
  await run(cli, [
    'uastc', intermediatePath, outputPath,
    '--slots', colourSlots,
    '--level', '2',
    '--zstd', '20',
    '--jobs', '4',
  ], { env, maxBuffer: 8 * 1024 * 1024 })
  const source = await readFile(inputPath)
  const derivative = await readFile(outputPath)
  records.push({
    id: asset.id,
    source: asset.input,
    derivative: `public/models/fred-studio-v2/optimised/ktx2/${asset.output}`,
    sourceBytes: source.byteLength,
    derivativeBytes: derivative.byteLength,
    sourceSha256: createHash('sha256').update(source).digest('hex'),
    derivativeSha256: await sha256(outputPath),
    dataUastcLevel: dataLevel,
    colourUastcLevel: 2,
  })
  console.log(`${asset.id}: ${source.byteLength} -> ${derivative.byteLength} bytes`)
}

await writeFile(path.join(manifestDir, 'ktx2-assets.json'), `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  encoder: 'toktx 4.4.2 through glTF-Transform 4.4.2',
  resolutionPolicy: 'Unchanged source dimensions',
  dataTextures: {
    slots: dataSlots,
    mode: 'UASTC level 3 minimum, Zstd 18, RDO disabled; room and MacBook retained their already-completed level 4 data pass',
    colorSpace: 'linear/non-colour',
  },
  colourTextures: {
    slots: colourSlots,
    mode: 'UASTC level 2, Zstd 20, RDO disabled after the higher-level paths exceeded the time budget',
    colorSpace: 'sRGB',
  },
  records,
}, null, 2)}\n`)
