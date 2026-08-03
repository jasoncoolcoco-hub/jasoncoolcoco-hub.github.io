import * as THREE from 'three'

function mulberry32(seed) {
  return () => {
    let value = seed += 0x6d2b79f5
    value = Math.imul(value ^ value >>> 15, value | 1)
    value ^= value + Math.imul(value ^ value >>> 7, value | 61)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}

function hexToRgb(hex) {
  const value = Number.parseInt(hex.replace('#', ''), 16)
  return { r: value >> 16, g: value >> 8 & 255, b: value & 255 }
}

function configureTexture(texture, repeat, color = false, name = '') {
  texture.name = name
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(...repeat)
  texture.anisotropy = 8
  if (color) texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function createNoiseCanvas({ size, seed, baseColor, grain, blotches }) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  const random = mulberry32(seed)
  const { r, g, b } = hexToRgb(baseColor)
  const image = context.createImageData(size, size)

  for (let index = 0; index < image.data.length; index += 4) {
    const variation = (random() - 0.5) * grain
    image.data[index] = THREE.MathUtils.clamp(r + variation, 0, 255)
    image.data[index + 1] = THREE.MathUtils.clamp(g + variation, 0, 255)
    image.data[index + 2] = THREE.MathUtils.clamp(b + variation, 0, 255)
    image.data[index + 3] = 255
  }
  context.putImageData(image, 0, 0)

  for (let index = 0; index < blotches; index += 1) {
    const x = random() * size
    const y = random() * size
    const radius = size * (0.08 + random() * 0.24)
    const lightness = random() > 0.5 ? 255 : 32
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, `rgba(${lightness},${lightness},${lightness},${0.012 + random() * 0.022})`)
    gradient.addColorStop(1, `rgba(${lightness},${lightness},${lightness},0)`)
    context.fillStyle = gradient
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2)
  }
  return canvas
}

function createGreyscaleCanvas({ size, seed, base, spread }) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  const random = mulberry32(seed)
  const image = context.createImageData(size, size)

  for (let index = 0; index < image.data.length; index += 4) {
    const value = THREE.MathUtils.clamp(base + (random() - 0.5) * spread, 0, 255)
    image.data[index] = value
    image.data[index + 1] = value
    image.data[index + 2] = value
    image.data[index + 3] = 255
  }
  context.putImageData(image, 0, 0)
  return canvas
}

export function createArchitecturalTextureSet({
  name,
  baseColor,
  seed,
  size = 512,
  repeat = [4, 4],
  grain = 10,
  blotches = 12,
  roughnessBase = 228,
  roughnessSpread = 22,
  bumpBase = 128,
  bumpSpread = 20,
}) {
  const map = configureTexture(
    new THREE.CanvasTexture(createNoiseCanvas({ size, seed, baseColor, grain, blotches })),
    repeat,
    true,
    `${name} color ${size}`,
  )
  const roughnessMap = configureTexture(
    new THREE.CanvasTexture(createGreyscaleCanvas({ size, seed: seed + 17, base: roughnessBase, spread: roughnessSpread })),
    repeat,
    false,
    `${name} roughness ${size}`,
  )
  const bumpMap = configureTexture(
    new THREE.CanvasTexture(createGreyscaleCanvas({ size, seed: seed + 41, base: bumpBase, spread: bumpSpread })),
    repeat,
    false,
    `${name} bump ${size}`,
  )
  return { map, roughnessMap, bumpMap, size }
}

export function createTimberTextureSet(size = 1024) {
  const colorCanvas = document.createElement('canvas')
  const roughnessCanvas = document.createElement('canvas')
  colorCanvas.width = size
  colorCanvas.height = size
  roughnessCanvas.width = size
  roughnessCanvas.height = size
  const color = colorCanvas.getContext('2d')
  const roughness = roughnessCanvas.getContext('2d')
  const random = mulberry32(2187)

  color.fillStyle = '#795f4b'
  color.fillRect(0, 0, size, size)
  roughness.fillStyle = '#c9c9c9'
  roughness.fillRect(0, 0, size, size)

  for (let line = 0; line < 150; line += 1) {
    const x = random() * size
    const alpha = 0.025 + random() * 0.055
    const drift = (random() - 0.5) * 38
    color.strokeStyle = `rgba(${random() > 0.5 ? '39,22,14' : '235,190,139'},${alpha})`
    color.lineWidth = 0.5 + random() * 1.4
    color.beginPath()
    color.moveTo(x, 0)
    color.bezierCurveTo(x + drift, size * 0.3, x - drift, size * 0.7, x + drift * 0.4, size)
    color.stroke()

    roughness.strokeStyle = `rgba(255,255,255,${0.015 + random() * 0.03})`
    roughness.lineWidth = 1
    roughness.beginPath()
    roughness.moveTo(x, 0)
    roughness.bezierCurveTo(x + drift, size * 0.3, x - drift, size * 0.7, x + drift * 0.4, size)
    roughness.stroke()
  }

  const map = configureTexture(new THREE.CanvasTexture(colorCanvas), [1.4, 5.5], true, `timber color ${size}`)
  const roughnessMap = configureTexture(
    new THREE.CanvasTexture(roughnessCanvas),
    [1.4, 5.5],
    false,
    `timber roughness ${size}`,
  )
  return { map, roughnessMap, size }
}
