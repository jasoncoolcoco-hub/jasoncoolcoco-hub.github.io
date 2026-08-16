import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SUPPORTED_IMAGE_PATTERN = /\.(?:jpe?g|png|webp)$/i
const JPEG_START_OF_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
])
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDirectory, '..')
const defaultPhotoWallDirectory = path.join(projectRoot, 'public/studio-v2/photo-wall')

function classifyStudioV2PhotoOrientation(width, height) {
  const aspect = width / height
  if (aspect >= 1.8) return 'wide-landscape'
  if (aspect > 1.08) return 'landscape'
  if (aspect <= 0.56) return 'tall-portrait'
  if (aspect < 0.92) return 'portrait'
  return 'square'
}

function assertReadableRange(buffer, offset, length, label) {
  if (offset < 0 || length < 0 || offset + length > buffer.length) {
    throw new Error(`${label} is truncated.`)
  }
}

function readExifOrientation(segment) {
  if (segment.length < 14 || segment.subarray(0, 6).toString('ascii') !== 'Exif\0\0') return 1
  const tiffOffset = 6
  const byteOrder = segment.subarray(tiffOffset, tiffOffset + 2).toString('ascii')
  if (byteOrder !== 'II' && byteOrder !== 'MM') return 1
  const littleEndian = byteOrder === 'II'
  const readUInt16 = (offset) => {
    assertReadableRange(segment, offset, 2, 'EXIF metadata')
    return littleEndian ? segment.readUInt16LE(offset) : segment.readUInt16BE(offset)
  }
  const readUInt32 = (offset) => {
    assertReadableRange(segment, offset, 4, 'EXIF metadata')
    return littleEndian ? segment.readUInt32LE(offset) : segment.readUInt32BE(offset)
  }
  if (readUInt16(tiffOffset + 2) !== 42) return 1
  const ifdOffset = tiffOffset + readUInt32(tiffOffset + 4)
  const entryCount = readUInt16(ifdOffset)
  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = ifdOffset + 2 + index * 12
    assertReadableRange(segment, entryOffset, 12, 'EXIF directory')
    if (readUInt16(entryOffset) !== 0x0112) continue
    const orientation = readUInt16(entryOffset + 8)
    return orientation >= 1 && orientation <= 8 ? orientation : 1
  }
  return 1
}

function readJpegMetadata(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error('invalid JPEG signature')
  }
  let offset = 2
  let orientation = 1
  let dimensions = null

  while (offset < buffer.length) {
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1
    if (offset >= buffer.length) break
    const marker = buffer[offset]
    offset += 1
    if (marker === 0xd9 || marker === 0xda) break
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
    assertReadableRange(buffer, offset, 2, 'JPEG segment')
    const segmentLength = buffer.readUInt16BE(offset)
    if (segmentLength < 2) throw new Error('invalid JPEG segment length')
    const dataOffset = offset + 2
    const dataLength = segmentLength - 2
    assertReadableRange(buffer, dataOffset, dataLength, 'JPEG segment')
    if (
      marker === 0xe1
      && buffer.subarray(dataOffset, dataOffset + Math.min(6, dataLength)).toString('ascii') === 'Exif\0\0'
    ) {
      orientation = readExifOrientation(buffer.subarray(dataOffset, dataOffset + dataLength))
    }
    if (JPEG_START_OF_FRAME_MARKERS.has(marker)) {
      assertReadableRange(buffer, dataOffset, 5, 'JPEG frame')
      dimensions = {
        height: buffer.readUInt16BE(dataOffset + 1),
        width: buffer.readUInt16BE(dataOffset + 3),
      }
    }
    offset = dataOffset + dataLength
  }

  if (!dimensions || dimensions.width === 0 || dimensions.height === 0) {
    throw new Error('JPEG dimensions were not found')
  }
  if (orientation >= 5 && orientation <= 8) {
    return { width: dimensions.height, height: dimensions.width }
  }
  return dimensions
}

function readPngMetadata(buffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(signature)) {
    throw new Error('invalid PNG signature')
  }
  if (buffer.subarray(12, 16).toString('ascii') !== 'IHDR') throw new Error('PNG has no IHDR chunk')
  const width = buffer.readUInt32BE(16)
  const height = buffer.readUInt32BE(20)
  if (width === 0 || height === 0) throw new Error('PNG dimensions are invalid')
  return { width, height }
}

function readWebpMetadata(buffer) {
  if (
    buffer.length < 30
    || buffer.subarray(0, 4).toString('ascii') !== 'RIFF'
    || buffer.subarray(8, 12).toString('ascii') !== 'WEBP'
  ) {
    throw new Error('invalid WebP signature')
  }
  const chunkType = buffer.subarray(12, 16).toString('ascii')
  if (chunkType === 'VP8X') {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    }
  }
  if (chunkType === 'VP8L') {
    if (buffer[20] !== 0x2f) throw new Error('invalid lossless WebP header')
    const bits = buffer.readUInt32LE(21)
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
    }
  }
  if (chunkType === 'VP8 ') {
    let frameOffset = 20
    while (
      frameOffset + 9 < buffer.length
      && !(buffer[frameOffset + 3] === 0x9d && buffer[frameOffset + 4] === 0x01 && buffer[frameOffset + 5] === 0x2a)
    ) frameOffset += 1
    assertReadableRange(buffer, frameOffset, 10, 'WebP frame')
    if (!(buffer[frameOffset + 3] === 0x9d && buffer[frameOffset + 4] === 0x01 && buffer[frameOffset + 5] === 0x2a)) {
      throw new Error('WebP frame dimensions were not found')
    }
    return {
      width: buffer.readUInt16LE(frameOffset + 6) & 0x3fff,
      height: buffer.readUInt16LE(frameOffset + 8) & 0x3fff,
    }
  }
  throw new Error(`unsupported WebP chunk ${chunkType || '(missing)'}`)
}

export function readStudioV2PhotoMetadata(filePath) {
  const extension = path.extname(filePath).toLowerCase()
  const buffer = fs.readFileSync(filePath)
  let dimensions
  if (extension === '.jpg' || extension === '.jpeg') dimensions = readJpegMetadata(buffer)
  else if (extension === '.png') dimensions = readPngMetadata(buffer)
  else if (extension === '.webp') dimensions = readWebpMetadata(buffer)
  else throw new Error(`unsupported extension ${extension || '(none)'}`)
  const aspectRatio = Number((dimensions.width / dimensions.height).toFixed(6))
  return {
    width: dimensions.width,
    height: dimensions.height,
    aspectRatio,
    orientation: classifyStudioV2PhotoOrientation(dimensions.width, dimensions.height),
  }
}

function stablePhotoId(filename, usedIds) {
  const extension = path.extname(filename)
  const stem = filename.slice(0, -extension.length)
  const slug = stem.normalize('NFKD').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toUpperCase() || 'IMAGE'
  const hash = crypto.createHash('sha256').update(filename.normalize('NFC').toLowerCase()).digest('hex').toUpperCase()
  for (let hashLength = 8; hashLength <= hash.length; hashLength += 4) {
    const candidate = `PHOTO_${slug.slice(0, 48)}_${hash.slice(0, hashLength)}`
    if (!usedIds.has(candidate)) return candidate
  }
  throw new Error(`Unable to allocate a unique ID for ${filename}.`)
}

export function scanStudioV2PhotoDirectory(sourceDirectory) {
  const photos = []
  const issues = []
  const directoryEntries = fs.readdirSync(sourceDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
    .sort((left, right) => left.name.localeCompare(right.name, 'en', { numeric: true, sensitivity: 'base' }))

  for (const entry of directoryEntries) {
    if (!SUPPORTED_IMAGE_PATTERN.test(entry.name)) {
      issues.push({ filename: entry.name, reason: 'unsupported file type' })
      continue
    }
    try {
      photos.push({ filename: entry.name, ...readStudioV2PhotoMetadata(path.join(sourceDirectory, entry.name)) })
    } catch (error) {
      issues.push({ filename: entry.name, reason: error.message })
    }
  }
  return { issues, photos }
}

export function mergeStudioV2PhotoManifest(manifest, inventory) {
  if (manifest?.version !== 1 || !Array.isArray(manifest.photos)) {
    throw new Error('Photo-wall manifest must use version 1 and contain a photos array.')
  }
  const photos = manifest.photos.map((entry) => ({ ...entry }))
  const existingEntriesPreserved = photos.length
  const placementDefaults = {
    enabled: manifest.defaults?.enabled ?? true,
    rotation: manifest.defaults?.rotation ?? 0,
    size: manifest.defaults?.size ?? 'medium',
    style: manifest.defaults?.style ?? 'print',
    x: manifest.defaults?.x ?? null,
    y: manifest.defaults?.y ?? null,
    zOrder: manifest.defaults?.zOrder ?? 0,
  }
  const byFilename = new Map()
  const usedIds = new Set()
  for (const entry of photos) {
    for (const [field, defaultValue] of Object.entries(placementDefaults)) {
      if (entry[field] === undefined) entry[field] = defaultValue
    }
    if (!entry.id || usedIds.has(entry.id)) throw new Error(`Manifest has a missing or duplicate photo ID: ${entry.id}.`)
    usedIds.add(entry.id)
    if (entry.filename) {
      if (byFilename.has(entry.filename)) throw new Error(`Manifest has duplicate filename entries: ${entry.filename}.`)
      byFilename.set(entry.filename, entry)
    }
  }

  let newManifestEntries = 0
  for (const sourcePhoto of inventory) {
    const existing = byFilename.get(sourcePhoto.filename)
    if (existing) {
      Object.assign(existing, sourcePhoto)
      continue
    }
    const photo = {
      id: stablePhotoId(sourcePhoto.filename, usedIds),
      ...sourcePhoto,
      style: 'print',
      size: 'medium',
      fitMode: 'contain',
      caption: '',
      rotation: 0,
      x: null,
      y: null,
      zOrder: 0,
      enabled: true,
    }
    usedIds.add(photo.id)
    photos.push(photo)
    byFilename.set(photo.filename, photo)
    newManifestEntries += 1
  }

  return {
    manifest: { ...manifest, photos },
    existingEntriesPreserved,
    newManifestEntries,
  }
}

function buildSummary(scan, merge) {
  const orientations = {
    landscape: 0,
    portrait: 0,
    square: 0,
    'wide-landscape': 0,
    'tall-portrait': 0,
  }
  for (const photo of scan.photos) orientations[photo.orientation] += 1
  return {
    totalValidPhotos: scan.photos.length,
    orientations,
    newManifestEntries: merge.newManifestEntries,
    existingEntriesPreserved: merge.existingEntriesPreserved,
    issues: scan.issues,
  }
}

export function intakeStudioV2Photos({ check = false, photoWallDirectory = defaultPhotoWallDirectory } = {}) {
  const sourceDirectory = path.join(photoWallDirectory, 'source')
  const manifestPath = path.join(photoWallDirectory, 'manifest.json')
  const currentText = fs.readFileSync(manifestPath, 'utf8')
  const currentManifest = JSON.parse(currentText)
  const scan = scanStudioV2PhotoDirectory(sourceDirectory)
  const merge = mergeStudioV2PhotoManifest(currentManifest, scan.photos)
  const nextText = `${JSON.stringify(merge.manifest, null, 2)}\n`
  const changed = nextText !== currentText
  if (check && changed) throw new Error('Photo manifest is out of date. Run npm run photos:intake.')
  if (!check && changed) fs.writeFileSync(manifestPath, nextText)
  return { ...buildSummary(scan, merge), changed }
}

function formatSummary(summary, mode) {
  const lines = [
    `Photo intake ${mode}: ${summary.totalValidPhotos} valid source photos`,
    `Orientations: ${Object.entries(summary.orientations).map(([name, count]) => `${name}=${count}`).join(', ')}`,
    `Manifest: ${summary.newManifestEntries} new, ${summary.existingEntriesPreserved} existing preserved`,
    `Unsupported/corrupt: ${summary.issues.length}`,
  ]
  for (const issue of summary.issues) lines.push(`- ${issue.filename}: ${issue.reason}`)
  return lines.join('\n')
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check')
  const summary = intakeStudioV2Photos({ check })
  console.log(formatSummary(summary, check ? 'check passed' : summary.changed ? 'updated manifest' : 'no changes'))
}
