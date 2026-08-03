import * as THREE from 'three'
import { debugViews, studioDimensions, studioLayout } from '../config/studioConfig'

function createLabelSprite(text, position) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 96
  const context = canvas.getContext('2d')
  context.fillStyle = 'rgba(12, 14, 14, 0.78)'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#f1eee7'
  context.font = '600 28px Arial'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(text, canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true })
  const sprite = new THREE.Sprite(material)
  sprite.position.set(...position)
  sprite.scale.set(4.8, 0.9, 1)
  sprite.visible = false
  return sprite
}

export function createDebugCameraTools(scene, camera, controls) {
  const grid = new THREE.GridHelper(52, 52, '#b9a47b', '#665f55')
  grid.position.y = 0.035
  grid.visible = false
  scene.add(grid)

  const axes = new THREE.AxesHelper(6)
  axes.visible = false
  scene.add(axes)

  const labels = [
    createLabelSprite('FACE 0 / FLOOR', [0, 1.4, 0]),
    createLabelSprite('FACE 1 / GLASS FACADE', [-19, 15.2, -5]),
    createLabelSprite('FACE 2 / REAR TRIANGULAR WALL', [0, 9, 23]),
    createLabelSprite('FACE 3 / ROOF', [0, 20, -7]),
  ]
  labels.forEach((label) => scene.add(label))

  const setView = (viewName) => {
    const view = debugViews[viewName] || debugViews.hero
    camera.position.set(...view.position)
    camera.fov = view.fov
    camera.updateProjectionMatrix()
    controls.target.set(...view.target)
    camera.up.set(0, 1, 0)
    controls.update()
    if (viewName === 'hero' && view.roll) camera.rotateZ(view.roll)
  }

  const setWireframe = (enabled) => {
    scene.traverse((object) => {
      if (!object.isMesh || !object.material) return
      object.material.wireframe = enabled
    })
  }

  return {
    setView,
    setGrid(visible) { grid.visible = visible },
    setAxes(visible) { axes.visible = visible },
    setLabels(visible) { labels.forEach((label) => { label.visible = visible }) },
    setWireframe,
    setFov(fov) {
      camera.fov = Number(fov)
      camera.updateProjectionMatrix()
    },
    getCameraState() {
      return {
        position: camera.position.toArray().map((value) => Number(value.toFixed(2))),
        target: controls.target.toArray().map((value) => Number(value.toFixed(2))),
        fov: Number(camera.fov.toFixed(1)),
      }
    },
    dimensions: studioDimensions,
    structures: studioLayout,
  }
}
