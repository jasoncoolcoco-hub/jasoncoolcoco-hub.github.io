import * as THREE from 'three'
import {
  debugViews,
  studioCoordinateSystem,
  studioDimensions,
  studioLayout,
} from '../config/studioConfig'

function createLabelSprite(text, position, scale = [4.8, 0.9, 1]) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 96
  const context = canvas.getContext('2d')
  const drawText = (nextText) => {
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = 'rgba(12, 14, 14, 0.82)'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#f1eee7'
    context.font = '600 28px Arial'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(nextText, canvas.width / 2, canvas.height / 2)
  }
  drawText(text)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true })
  const sprite = new THREE.Sprite(material)
  sprite.position.set(...position)
  sprite.scale.set(...scale)
  sprite.visible = false
  sprite.userData.setText = (nextText) => {
    drawText(nextText)
    texture.needsUpdate = true
  }
  return sprite
}

function createMetricFloorGrid() {
  const group = new THREE.Group()
  group.name = 'MetricCoordinateGrid'
  const { x: [xMin, xMax], z: [zMin, zMax] } = studioCoordinateSystem.floorBounds
  const minor = []
  const major = []
  const addLine = (target, x1, z1, x2, z2) => target.push(x1, 0.07, z1, x2, 0.07, z2)

  for (let x = xMin; x <= xMax; x += 1) {
    addLine(x % 10 === 0 ? major : minor, x, zMin, x, zMax)
  }
  for (let z = zMin; z <= zMax; z += 1) {
    addLine(z % 10 === 0 ? major : minor, xMin, z, xMax, z)
  }

  const minorGeometry = new THREE.BufferGeometry()
  minorGeometry.setAttribute('position', new THREE.Float32BufferAttribute(minor, 3))
  const majorGeometry = new THREE.BufferGeometry()
  majorGeometry.setAttribute('position', new THREE.Float32BufferAttribute(major, 3))
  group.add(new THREE.LineSegments(
    minorGeometry,
    new THREE.LineBasicMaterial({ color: '#807869', transparent: true, opacity: 0.25 }),
  ))
  group.add(new THREE.LineSegments(
    majorGeometry,
    new THREE.LineBasicMaterial({ color: '#d2b780', transparent: true, opacity: 0.62 }),
  ))
  group.visible = false
  return group
}

function createCoordinateMarker() {
  const group = new THREE.Group()
  group.name = 'CoordinateMarker'
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 18, 12),
    new THREE.MeshBasicMaterial({ color: '#f0bd66', depthTest: false }),
  )
  marker.renderOrder = 8
  group.add(marker)
  const crossGeometry = new THREE.BufferGeometry()
  crossGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -1.25, 0, 0, 1.25, 0, 0,
    0, -1.25, 0, 0, 1.25, 0,
    0, 0, -1.25, 0, 0, 1.25,
  ], 3))
  const cross = new THREE.LineSegments(
    crossGeometry,
    new THREE.LineBasicMaterial({ color: '#f0bd66', depthTest: false }),
  )
  cross.renderOrder = 8
  group.add(cross)
  const label = createLabelSprite('0.00, 0.00, 0.00', [0, 1.35, 0], [5.4, 1, 1])
  label.visible = true
  group.add(label)
  group.userData.label = label
  group.visible = false
  return group
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
  coordinatePicking = false,
  onCoordinatePick,
}) {
  const grid = createMetricFloorGrid()
  scene.add(grid)

  const axes = new THREE.AxesHelper(12)
  axes.name = 'DebugAxes'
  axes.position.set(...studioCoordinateSystem.origin)
  axes.visible = false
  scene.add(axes)

  const labels = [
    createLabelSprite('FACE 0 / FLOOR A-B-C-D', [56, 1.4, 36]),
    createLabelSprite('FACE 1 / WALL 1 / A-B', [110, 18, 36]),
    createLabelSprite('FACE 2 / WALL 2 / B-C', [56, 18, 70]),
    createLabelSprite('FACE 3 / FULL ROOF', [56, 35, 28]),
    createLabelSprite('D / ORIGIN / 0, 0, 0', [0, 1.25, 0], [4.4, 0.82, 1]),
    createLabelSprite('A / 112, 0, 0', [112, 1.25, 0], [3.8, 0.82, 1]),
    createLabelSprite('B / 112, 0, 72', [112, 1.25, 72], [4, 0.82, 1]),
    createLabelSprite('C / 0, 0, 72', [0, 1.25, 72], [3.8, 0.82, 1]),
  ]
  labels.forEach((label) => scene.add(label))

  const coordinateMarker = createCoordinateMarker()
  scene.add(coordinateMarker)
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()

  const setCoordinateMarker = (coordinate) => {
    const values = coordinate.map((value) => Number(value))
    if (values.some((value) => !Number.isFinite(value))) return false
    coordinateMarker.position.set(...values)
    coordinateMarker.userData.label.userData.setText(values.map((value) => value.toFixed(2)).join(', '))
    coordinateMarker.visible = true
    return true
  }

  const handleFloorClick = (event) => {
    const bounds = renderer.domElement.getBoundingClientRect()
    pointer.set(
      (event.clientX - bounds.left) / bounds.width * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    )
    raycaster.setFromCamera(pointer, camera)
    const point = new THREE.Vector3()
    if (!raycaster.ray.intersectPlane(floorPlane, point)) return
    const { x: xBounds, z: zBounds } = studioCoordinateSystem.floorBounds
    if (point.x < xBounds[0] || point.x > xBounds[1] || point.z < zBounds[0] || point.z > zBounds[1]) return
    const coordinate = [point.x, 0, point.z].map((value) => Number(value.toFixed(2)))
    setCoordinateMarker(coordinate)
    onCoordinatePick?.(coordinate)
  }
  if (coordinatePicking) {
    renderer.domElement.addEventListener('click', handleFloorClick)
  }

  const realisticMaterials = new Map()
  const instanceColors = new Map()
  const shadowState = new Map()
  const textureState = new Map()
  const roofJoints = scene.getObjectByName('RoofPanelJoints')
  const roofPlane = scene.getObjectByName('Face3RoofPlane')
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
    controls.minPolarAngle = viewName === 'top' ? 0.01 : Math.PI * 0.08
    camera.position.set(...view.position)
    camera.fov = view.fov
    camera.updateProjectionMatrix()
    controls.target.set(...view.target)
    camera.up.set(0, 1, 0)
    controls.update()
    if (viewName === 'hero' && view.roll) camera.rotateZ(view.roll)
    if (roofPlane) roofPlane.visible = viewName !== 'top'
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
    setCoordinateMarker,
    clearCoordinateMarker() { coordinateMarker.visible = false },
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
    disposeDebugMaterials() {
      renderer.domElement.removeEventListener('click', handleFloorClick)
      clayMaterial.dispose()
    },
    dimensions: studioDimensions,
    structures: studioLayout,
    coordinateSystem: studioCoordinateSystem,
  }
}
