import * as THREE from 'three'
import { studioMaterials } from '../config/studioConfig'

function createTimberTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 1024
  const context = canvas.getContext('2d')
  context.fillStyle = '#704a34'
  context.fillRect(0, 0, canvas.width, canvas.height)

  const boardHeight = 86
  for (let y = 0; y < canvas.height; y += boardHeight) {
    context.fillStyle = y % (boardHeight * 2) === 0 ? 'rgba(255,205,150,.045)' : 'rgba(35,18,11,.045)'
    context.fillRect(0, y, canvas.width, boardHeight)
    context.strokeStyle = 'rgba(31,18,12,.34)'
    context.lineWidth = 4
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(canvas.width, y)
    context.stroke()
    for (let line = 0; line < 5; line += 1) {
      context.strokeStyle = `rgba(43, 23, 13, ${0.035 + line * 0.01})`
      context.lineWidth = 1
      context.beginPath()
      context.moveTo(0, y + 13 + line * 12)
      context.bezierCurveTo(280, y + 18 + line * 12, 720, y + 8 + line * 12, canvas.width, y + 15 + line * 12)
      context.stroke()
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2.2, 5.8)
  texture.anisotropy = 8
  return texture
}

export function createStudioMaterials() {
  const materialSet = {}

  Object.entries(studioMaterials).forEach(([key, config]) => {
    if (key === 'glass') {
      materialSet[key] = new THREE.MeshPhysicalMaterial({
        color: config.color,
        roughness: config.roughness,
        metalness: 0.05,
        transparent: true,
        opacity: config.opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
      return
    }

    materialSet[key] = key === 'stageSeam'
      ? new THREE.LineBasicMaterial({ color: config.color, transparent: true, opacity: 0.52 })
      : new THREE.MeshStandardMaterial(config)
  })

  materialSet.timber.map = createTimberTexture()
  materialSet.timber.needsUpdate = true
  materialSet.canopy.side = THREE.DoubleSide
  materialSet.ceiling.side = THREE.DoubleSide
  materialSet.redCurtain.side = THREE.DoubleSide
  materialSet.rearCurtain.side = THREE.DoubleSide

  return materialSet
}
