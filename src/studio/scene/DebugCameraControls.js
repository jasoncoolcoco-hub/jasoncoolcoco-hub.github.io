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

function eachMaterial(material, callback) {
  const list = Array.isArray(material) ? material : [material]
  list.forEach((item) => item && callback(item))
}

export function createDebugCameraTools({
  scene,
  camera,
  controls,
  renderer,
  materials,
  lightingGroup,
}) {
  const gridSize = Math.max(studioDimensions.width, studioDimensions.depth) + 8
  const grid = new THREE.GridHelper(gridSize, 64, '#b9a47b', '#665f55')
  grid.name = 'DebugGrid'
  grid.position.y = 0.075
  grid.visible = false
  scene.add(grid)

  const axes = new THREE.AxesHelper(6)
  axes.name = 'DebugAxes'
  axes.visible = false
  scene.add(axes)

  const labels = [
    createLabelSprite('FACE 0 / FLOOR A-B-C-D', [0, 1.4, 0]),
    createLabelSprite('FACE 1 / WALL 1 / A-B', [-27, 14, 0]),
    createLabelSprite('FACE 2 / WALL 2 / B-C', [0, 13, 17]),
    createLabelSprite('FACE 3 / FULL ROOF', [0, 25, -7]),
  ]
  labels.forEach((label) => scene.add(label))

  const realisticMaterials = new Map()
  const instanceColors = new Map()
  const shadowState = new Map()
  const textureState = new Map()
  const roofJoints = scene.getObjectByName('RoofPanelJoints')
  const glassPanels = scene.getObjectByName('GlassPanels')
  scene.traverse((object) => {
    if (object.isMesh && object.material) {
      realisticMaterials.set(object, object.material)
      if (object.isInstancedMesh && object.instanceColor) instanceColors.set(object, object.instanceColor)
      shadowState.set(object, { castShadow: object.castShadow, receiveShadow: object.receiveShadow })
      eachMaterial(object.material, (material) => {
        if (textureState.has(material)) return
        textureState.set(material, {
          map: material.map,
          roughnessMap: material.roughnessMap,
          bumpMap: material.bumpMap,
          normalMap: material.normalMap,
          aoMap: material.aoMap,
        })
      })
    }
  })

  const clayMaterial = new THREE.MeshStandardMaterial({
    name: 'Clay Inspection Material',
    color: '#aaa8a2',
    roughness: 0.88,
    metalness: 0,
  })
  let renderMode = 'realistic'

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

  const setRenderMode = (modeName) => {
    renderMode = modeName === 'clay' ? 'clay' : 'realistic'
    realisticMaterials.forEach((material, object) => {
      object.material = renderMode === 'clay' ? clayMaterial : material
      if (object.isInstancedMesh && instanceColors.has(object)) {
        object.instanceColor = renderMode === 'clay' ? null : instanceColors.get(object)
        object.material.needsUpdate = true
      }
    })
    if (roofJoints) roofJoints.visible = renderMode !== 'clay'
  }

  const setWireframe = (enabled) => {
    scene.traverse((object) => {
      if (!object.isMesh || !object.material) return
      eachMaterial(object.material, (material) => {
        material.wireframe = enabled
        material.needsUpdate = true
      })
    })
  }

  const setMaterials = (enabled) => {
    textureState.forEach((state, material) => {
      material.map = enabled ? state.map : null
      material.roughnessMap = enabled ? state.roughnessMap : null
      material.bumpMap = enabled ? state.bumpMap : null
      material.normalMap = enabled ? state.normalMap : null
      material.aoMap = enabled ? state.aoMap : null
      material.needsUpdate = true
    })
  }

  const setShadows = (enabled) => {
    renderer.shadowMap.enabled = enabled
    shadowState.forEach((state, object) => {
      object.castShadow = enabled && state.castShadow
      object.receiveShadow = enabled && state.receiveShadow
    })
  }

  return {
    setView,
    setGrid(visible) { grid.visible = visible },
    setAxes(visible) { axes.visible = visible },
    setLabels(visible) { labels.forEach((label) => { label.visible = visible }) },
    setWireframe,
    setMaterials,
    setLighting(visible) { lightingGroup.visible = visible },
    setShadows,
    setGlass(visible) { if (glassPanels) glassPanels.visible = visible },
    setRenderMode,
    setNightMode(enabled) { lightingGroup.userData.setProfile?.(enabled ? 'night' : 'realistic') },
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
    getDiagnostics() {
      return {
        renderMode,
        dpr: renderer.getPixelRatio(),
        shadowMapSize: renderer.shadowMap.enabled ? 2048 : 0,
        textureSizes: materials.__textureSizes,
      }
    },
    disposeDebugMaterials() { clayMaterial.dispose() },
    dimensions: studioDimensions,
    structures: studioLayout,
  }
}
