import * as THREE from 'three'
import {
  STUDIO_V2_COORDINATE_SYSTEM,
  STUDIO_V2_FLOOR_Y,
  STUDIO_V2_PLACEMENT_GRID,
  formatStudioV2Vector,
  roundStudioV2Coordinate,
} from './studioV2Coordinates'
import { formatStudioV2Anchor } from './studioV2Anchors'

const AXIS_LENGTH = 3
const PICK_MARKER_RADIUS = 0.035
const PICK_CLICK_TOLERANCE = 5
const SURFACE_CLEARANCE = 0.012

function roundedVector(vector) {
  return vector.toArray().slice(0, 3).map(roundStudioV2Coordinate)
}

function disposeObject(object) {
  object.traverse((child) => {
    child.geometry?.dispose?.()
    if (Array.isArray(child.material)) child.material.forEach((material) => material?.dispose?.())
    else child.material?.dispose?.()
    child.material?.map?.dispose?.()
  })
}

function createLabelSprite(label, color) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 64
  const context = canvas.getContext('2d')
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.font = '700 44px ui-monospace, SFMono-Regular, Menlo, monospace'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = color
  context.fillText(label, canvas.width / 2, canvas.height / 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(0.42, 0.21, 1)
  sprite.renderOrder = 1000
  return sprite
}

function createAxesGroup() {
  const group = new THREE.Group()
  group.name = 'StudioV2SpatialAxes'
  const axes = new THREE.AxesHelper(AXIS_LENGTH)
  axes.name = 'StudioV2WorldAxes'
  const xLabel = createLabelSprite('+X', '#ff7777')
  const yLabel = createLabelSprite('+Y', '#77e890')
  const zLabel = createLabelSprite('+Z', '#71a9ff')
  xLabel.position.set(AXIS_LENGTH + 0.24, 0, 0)
  yLabel.position.set(0, AXIS_LENGTH + 0.24, 0)
  zLabel.position.set(0, 0, AXIS_LENGTH + 0.24)
  group.add(axes, xLabel, yLabel, zLabel)
  group.visible = false
  group.traverse((object) => {
    object.castShadow = false
    object.receiveShadow = false
  })
  return group
}

function gridValues(min, max, step) {
  const values = []
  const first = Math.ceil((min - 0.0001) / step) * step
  for (let value = first; value <= max + 0.0001; value += step) {
    values.push(Number(value.toFixed(5)))
  }
  return values
}

function createGridLines({ major }) {
  const y = STUDIO_V2_FLOOR_Y + STUDIO_V2_PLACEMENT_GRID.yOffset
  const positions = []
  const xValues = gridValues(
    STUDIO_V2_PLACEMENT_GRID.minX,
    STUDIO_V2_PLACEMENT_GRID.maxX,
    STUDIO_V2_PLACEMENT_GRID.minorStep,
  )
  const zValues = gridValues(
    STUDIO_V2_PLACEMENT_GRID.minZ,
    STUDIO_V2_PLACEMENT_GRID.maxZ,
    STUDIO_V2_PLACEMENT_GRID.minorStep,
  )
  xValues.forEach((x) => {
    const isMajor = Math.abs(x / STUDIO_V2_PLACEMENT_GRID.majorStep
      - Math.round(x / STUDIO_V2_PLACEMENT_GRID.majorStep)) < 0.0001
    if (isMajor !== major) return
    positions.push(
      x, y, STUDIO_V2_PLACEMENT_GRID.minZ,
      x, y, STUDIO_V2_PLACEMENT_GRID.maxZ,
    )
  })
  zValues.forEach((z) => {
    const isMajor = Math.abs(z / STUDIO_V2_PLACEMENT_GRID.majorStep
      - Math.round(z / STUDIO_V2_PLACEMENT_GRID.majorStep)) < 0.0001
    if (isMajor !== major) return
    positions.push(
      STUDIO_V2_PLACEMENT_GRID.minX, y, z,
      STUDIO_V2_PLACEMENT_GRID.maxX, y, z,
    )
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const material = new THREE.LineBasicMaterial({
    color: major ? '#8ca0aa' : '#68757c',
    transparent: true,
    opacity: major ? 0.58 : 0.26,
    depthWrite: false,
  })
  return new THREE.LineSegments(geometry, material)
}

function createFloorGrid() {
  const group = new THREE.Group()
  group.name = 'StudioV2PlacementGrid'
  group.add(createGridLines({ major: false }), createGridLines({ major: true }))
  group.visible = false
  group.traverse((object) => {
    object.castShadow = false
    object.receiveShadow = false
  })
  return group
}

function createBoundsGroup({ interiorBounds, cameraBounds, targetBounds }) {
  const group = new THREE.Group()
  group.name = 'StudioV2PlacementBounds'
  const entries = [
    ['StudioV2InteriorBounds', interiorBounds, '#8ca8b8'],
    ['StudioV2CameraSafeBounds', cameraBounds, '#5b8fc9'],
    ['StudioV2TargetSafeBounds', targetBounds, '#72a896'],
  ]
  entries.forEach(([name, box, color]) => {
    const helper = new THREE.Box3Helper(box.clone(), color)
    helper.name = name
    helper.material.transparent = true
    helper.material.opacity = 0.62
    helper.material.depthWrite = false
    helper.castShadow = false
    helper.receiveShadow = false
    group.add(helper)
  })
  group.visible = false
  return group
}

function classifySurface(position, normal) {
  if (![position.x, position.y, position.z, normal.x, normal.y, normal.z].every(Number.isFinite)) {
    return 'UNSUITABLE'
  }
  if (normal.y >= 0.85) {
    return Math.abs(position.y - STUDIO_V2_FLOOR_Y) <= 0.08 ? 'FLOOR' : 'HORIZONTAL UP'
  }
  if (normal.y <= -0.85) return 'CEILING / DOWNWARD'
  if (Math.abs(normal.y) <= 0.2) return 'VERTICAL WALL'
  return 'ANGLED'
}

function formatPickedPosition(pick) {
  return pick ? `position: ${formatStudioV2Vector(pick.position)}` : 'position: null'
}

function formatPickedPositionAndNormal(pick) {
  if (!pick) return 'position: null\nsurfaceNormal: null'
  return [
    `position: ${formatStudioV2Vector(pick.position)}`,
    `surfaceNormal: ${formatStudioV2Vector(pick.normal)}`,
  ].join('\n')
}

function formatPlaceholderTransform(placeholder) {
  const effectiveScale = placeholder.size.map((value) => value * placeholder.uniformScale)
  return [
    '{',
    `  position: ${formatStudioV2Vector(placeholder.position)},`,
    `  rotation: ${formatStudioV2Vector(placeholder.rotation)}, // radians`,
    `  scale: ${formatStudioV2Vector(effectiveScale)},`,
    `  size: ${formatStudioV2Vector(placeholder.size)},`,
    `  uniformScale: ${Number(placeholder.uniformScale).toFixed(3)},`,
    '}',
  ].join('\n')
}

export function createStudioV2SpatialDebug({
  scene,
  camera,
  renderer,
  modelRoot,
  interiorBounds,
  cameraBounds,
  targetBounds,
  environmentMeshName,
}) {
  const axesGroup = createAxesGroup()
  const gridGroup = createFloorGrid()
  const boundsGroup = createBoundsGroup({ interiorBounds, cameraBounds, targetBounds })
  const placeholderMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({
      color: '#b8c0c4',
      transparent: true,
      opacity: 0.84,
      wireframe: true,
      depthTest: false,
    }),
  )
  placeholderMesh.name = 'PLACEMENT_PLACEHOLDER'
  placeholderMesh.renderOrder = 999
  placeholderMesh.castShadow = false
  placeholderMesh.receiveShadow = false
  const pickMarker = new THREE.Mesh(
    new THREE.SphereGeometry(PICK_MARKER_RADIUS, 14, 10),
    new THREE.MeshBasicMaterial({ color: '#d7d3ca', depthTest: false, depthWrite: false }),
  )
  pickMarker.name = 'StudioV2PickMarker'
  pickMarker.renderOrder = 1001
  pickMarker.castShadow = false
  pickMarker.receiveShadow = false

  const placeholder = {
    visible: false,
    position: [-3.5, roundStudioV2Coordinate(STUDIO_V2_FLOOR_Y + 0.2), 0],
    rotation: [0, 0, 0],
    size: [0.6, 0.4, 0.4],
    uniformScale: 1,
  }
  const state = {
    axes: false,
    grid: false,
    bounds: false,
    pickEnabled: false,
    pick: null,
    placeholder,
    anchorDraft: null,
    anchorName: 'MACBOOK_DESK',
  }

  const pickMeshes = []
  modelRoot.traverse((object) => {
    if (!object.isMesh || !object.visible || object.name === environmentMeshName) return
    pickMeshes.push(object)
  })
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const pointerDown = new THREE.Vector2()
  const normalMatrix = new THREE.Matrix3()
  const localNormal = new THREE.Vector3()
  const worldNormal = new THREE.Vector3()
  let pointerIsDown = false

  function applyPlaceholder() {
    placeholderMesh.visible = placeholder.visible
    placeholderMesh.position.fromArray(placeholder.position)
    placeholderMesh.rotation.fromArray(placeholder.rotation)
    placeholderMesh.scale.set(
      placeholder.size[0] * placeholder.uniformScale,
      placeholder.size[1] * placeholder.uniformScale,
      placeholder.size[2] * placeholder.uniformScale,
    )
  }

  function updateMarker() {
    pickMarker.visible = Boolean(state.pickEnabled && state.pick)
    if (!state.pick) return
    pickMarker.position.fromArray(state.pick.position)
    pickMarker.position.addScaledVector(worldNormal.fromArray(state.pick.normal), SURFACE_CLEARANCE)
  }

  function pickAtEvent(event) {
    if (!state.pickEnabled) return
    const bounds = renderer.domElement.getBoundingClientRect()
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    )
    raycaster.setFromCamera(pointer, camera)
    const intersection = raycaster.intersectObjects(pickMeshes, false)[0]
    if (!intersection?.face) return
    localNormal.copy(intersection.face.normal)
    normalMatrix.getNormalMatrix(intersection.object.matrixWorld)
    worldNormal.copy(localNormal).applyMatrix3(normalMatrix).normalize()
    const material = Array.isArray(intersection.object.material)
      ? intersection.object.material[intersection.face.materialIndex] ?? intersection.object.material[0]
      : intersection.object.material
    state.pick = {
      position: roundedVector(intersection.point),
      normal: roundedVector(worldNormal),
      mesh: intersection.object.name || '(unnamed mesh)',
      material: material?.name || '(unnamed material)',
      surfaceType: classifySurface(intersection.point, worldNormal),
      cameraDistance: roundStudioV2Coordinate(intersection.distance),
    }
    updateMarker()
  }

  function handlePointerDown(event) {
    if (!state.pickEnabled || event.button !== 0) return
    pointerDown.set(event.clientX, event.clientY)
    pointerIsDown = true
  }

  function handlePointerUp(event) {
    if (!pointerIsDown || event.button !== 0) return
    pointerIsDown = false
    const movement = pointerDown.distanceTo(new THREE.Vector2(event.clientX, event.clientY))
    if (movement <= PICK_CLICK_TOLERANCE) pickAtEvent(event)
  }

  renderer.domElement.addEventListener('pointerdown', handlePointerDown)
  renderer.domElement.addEventListener('pointerup', handlePointerUp)
  scene.add(axesGroup, gridGroup, boundsGroup, placeholderMesh, pickMarker)
  applyPlaceholder()
  updateMarker()

  const api = {
    setAxes(visible) {
      state.axes = Boolean(visible)
      axesGroup.visible = state.axes
      return state.axes
    },
    setGrid(visible) {
      state.grid = Boolean(visible)
      gridGroup.visible = state.grid
      return state.grid
    },
    setBounds(visible) {
      state.bounds = Boolean(visible)
      boundsGroup.visible = state.bounds
      return state.bounds
    },
    setPickEnabled(enabled) {
      state.pickEnabled = Boolean(enabled)
      renderer.domElement.style.cursor = state.pickEnabled ? 'crosshair' : ''
      updateMarker()
      return state.pickEnabled
    },
    clearPick() {
      state.pick = null
      updateMarker()
    },
    copyPosition() {
      return formatPickedPosition(state.pick)
    },
    copyPositionAndNormal() {
      return formatPickedPositionAndNormal(state.pick)
    },
    setPlaceholderVisible(visible) {
      placeholder.visible = Boolean(visible)
      applyPlaceholder()
      return placeholder.visible
    },
    setPlaceholderPosition(axis, value) {
      placeholder.position[axis] = roundStudioV2Coordinate(value)
      applyPlaceholder()
    },
    setPlaceholderRotationDegrees(axis, value) {
      placeholder.rotation[axis] = roundStudioV2Coordinate(THREE.MathUtils.degToRad(Number(value)))
      applyPlaceholder()
    },
    setPlaceholderSize(axis, value) {
      placeholder.size[axis] = Math.max(0.01, roundStudioV2Coordinate(value))
      applyPlaceholder()
    },
    setPlaceholderUniformScale(value) {
      placeholder.uniformScale = Math.max(0.01, roundStudioV2Coordinate(value))
      applyPlaceholder()
    },
    resetPlaceholder() {
      placeholder.position = [-3.5, roundStudioV2Coordinate(STUDIO_V2_FLOOR_Y + 0.2), 0]
      placeholder.rotation = [0, 0, 0]
      placeholder.size = [0.6, 0.4, 0.4]
      placeholder.uniformScale = 1
      applyPlaceholder()
    },
    movePlaceholderToPick() {
      if (!state.pick) return false
      const point = new THREE.Vector3().fromArray(state.pick.position)
      const normal = new THREE.Vector3().fromArray(state.pick.normal).normalize()
      let halfExtent = placeholder.size[1] * placeholder.uniformScale / 2
      if (state.pick.surfaceType === 'VERTICAL WALL') {
        halfExtent = placeholder.size[2] * placeholder.uniformScale / 2
      }
      point.addScaledVector(normal, halfExtent + SURFACE_CLEARANCE)
      placeholder.position = roundedVector(point)
      placeholder.visible = true
      applyPlaceholder()
      return true
    },
    alignPlaceholderToPick() {
      if (!state.pick) return false
      const normal = new THREE.Vector3().fromArray(state.pick.normal).normalize()
      const localAxis = state.pick.surfaceType === 'VERTICAL WALL'
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3(0, 1, 0)
      const quaternion = new THREE.Quaternion().setFromUnitVectors(localAxis, normal)
      const euler = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ')
      placeholder.rotation = roundedVector(euler)
      applyPlaceholder()
      return true
    },
    copyPlaceholderTransform() {
      return formatPlaceholderTransform(placeholder)
    },
    saveAnchorDraft(name) {
      const normal = state.pick?.normal ?? [0, 1, 0]
      const effectiveScale = placeholder.size.map((value) => (
        roundStudioV2Coordinate(value * placeholder.uniformScale)
      ))
      state.anchorName = name
      state.anchorDraft = {
        position: [...placeholder.position],
        rotation: [...placeholder.rotation],
        scale: effectiveScale,
        surfaceNormal: [...normal],
        note: `Debug placement draft for ${name}; review before adding to STUDIO_V2_ANCHORS.`,
      }
      return formatStudioV2Anchor(name, state.anchorDraft)
    },
    copyAnchor() {
      return formatStudioV2Anchor(state.anchorName, state.anchorDraft)
    },
    clearAnchorDraft() {
      state.anchorDraft = null
    },
    getState() {
      return {
        ...state,
        coordinateSystem: STUDIO_V2_COORDINATE_SYSTEM,
        floorY: STUDIO_V2_FLOOR_Y,
        grid: {
          visible: state.grid,
          minorStep: STUDIO_V2_PLACEMENT_GRID.minorStep,
          majorStep: STUDIO_V2_PLACEMENT_GRID.majorStep,
        },
        placeholder: {
          ...placeholder,
          position: [...placeholder.position],
          rotation: [...placeholder.rotation],
          rotationDegrees: placeholder.rotation.map((value) => (
            roundStudioV2Coordinate(THREE.MathUtils.radToDeg(value))
          )),
          size: [...placeholder.size],
          copyText: formatPlaceholderTransform(placeholder),
        },
        pick: state.pick ? { ...state.pick, position: [...state.pick.position], normal: [...state.pick.normal] } : null,
        anchorDraft: state.anchorDraft ? { ...state.anchorDraft } : null,
        anchorCopyText: formatStudioV2Anchor(state.anchorName, state.anchorDraft),
      }
    },
    dispose() {
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown)
      renderer.domElement.removeEventListener('pointerup', handlePointerUp)
      renderer.domElement.style.cursor = ''
      scene.remove(axesGroup, gridGroup, boundsGroup, placeholderMesh, pickMarker)
      disposeObject(axesGroup)
      disposeObject(gridGroup)
      disposeObject(boundsGroup)
      disposeObject(placeholderMesh)
      disposeObject(pickMarker)
      pickMeshes.length = 0
    },
  }

  return api
}
