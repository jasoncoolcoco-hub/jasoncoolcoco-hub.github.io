import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const outputDirectory = process.argv[2]

if (!outputDirectory) {
  throw new Error('Usage: node scripts/generate-studio-v2-photo-fixtures.mjs <output-directory>')
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }
  return value >>> 0
})

function crc32(buffer) {
  let value = 0xffffffff
  for (const byte of buffer) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8)
  return (value ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type)
  const chunk = Buffer.alloc(12 + data.length)
  chunk.writeUInt32BE(data.length, 0)
  typeBuffer.copy(chunk, 4)
  data.copy(chunk, 8)
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length)
  return chunk
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function createFixture({ width, height, colors, accent }) {
  const stride = width * 4 + 1
  const pixels = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y += 1) {
    const row = y * stride
    pixels[row] = 0
    for (let x = 0; x < width; x += 1) {
      const u = x / Math.max(1, width - 1)
      const v = y / Math.max(1, height - 1)
      const diagonal = Math.max(0, 1 - Math.hypot(u - 0.68, v - 0.38) * 2.4)
      const stripe = 0.5 + 0.5 * Math.sin((u * 3.1 + v * 1.7) * Math.PI)
      const mix = Math.min(1, v * 0.72 + stripe * 0.18)
      const offset = row + 1 + x * 4
      pixels[offset] = clampByte(colors[0][0] * (1 - mix) + colors[1][0] * mix + accent[0] * diagonal)
      pixels[offset + 1] = clampByte(colors[0][1] * (1 - mix) + colors[1][1] * mix + accent[1] * diagonal)
      pixels[offset + 2] = clampByte(colors[0][2] * (1 - mix) + colors[1][2] * mix + accent[2] * diagonal)
      pixels[offset + 3] = 255
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(pixels, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

const fixtures = [
  { filename: 'fixture-landscape.png', width: 720, height: 480, colors: [[26, 51, 67], [168, 112, 66]], accent: [74, 88, 72] },
  { filename: 'fixture-portrait.png', width: 420, height: 630, colors: [[52, 38, 68], [156, 92, 101]], accent: [86, 74, 58] },
  { filename: 'fixture-square.png', width: 560, height: 560, colors: [[32, 69, 55], [141, 126, 76]], accent: [68, 82, 66] },
  { filename: 'fixture-wide.png', width: 760, height: 380, colors: [[29, 45, 74], [122, 92, 72]], accent: [92, 80, 56] },
]

fs.mkdirSync(outputDirectory, { recursive: true })
for (const fixture of fixtures) {
  const outputPath = path.join(outputDirectory, fixture.filename)
  fs.writeFileSync(outputPath, createFixture(fixture))
  console.log(`${fixture.filename}: ${fixture.width}x${fixture.height}`)
}
