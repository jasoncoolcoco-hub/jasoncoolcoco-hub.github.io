import * as THREE from 'three'
import { STUDIO_V2_TABLE_OVERVIEW_POSE } from './studioV2CameraPoses'

export const STUDIO_V2_MACBOOK_FOCUS_CONFIG = Object.freeze({
  clickTolerancePx: 5,
  durationMs: 1500,
  exitDurationMs: 1300,
  fov: 47,
  near: 0.025,
  occupancy: 0.78,
  reducedMotionDurationMs: 200,
})

const round = (value, digits = 5) => Number(value.toFixed(digits))
const vectorRecord = (vector, digits = 5) => vector.toArray().map((value) => round(value, digits))

function axisVector(index, matrixWorld) {
  const axis = new THREE.Vector3()
  axis.setComponent(index, 1)
  return axis.transformDirection(matrixWorld).normalize()
}

function semanticDisplayFrame(displayMesh, referenceCameraPosition) {
  displayMesh.geometry.computeBoundingBox()
  displayMesh.updateWorldMatrix(true, false)
  const localBounds = displayMesh.geometry.boundingBox.clone()
  const localSize = localBounds.getSize(new THREE.Vector3())
  const worldScale = displayMesh.getWorldScale(new THREE.Vector3())
  const dimensions = [
    Math.abs(localSize.x * worldScale.x),
    Math.abs(localSize.y * worldScale.y),
    Math.abs(localSize.z * worldScale.z),
  ]
  const ranked = dimensions
    .map((value, index) => ({ index, value }))
    .sort((a, b) => b.value - a.value)
  const rightAxis = ranked[0].index
  const upAxis = ranked[1].index
  const normalAxis = ranked[2].index
  const center = localBounds.getCenter(new THREE.Vector3()).applyMatrix4(displayMesh.matrixWorld)
  const right = axisVector(rightAxis, displayMesh.matrixWorld)
  const up = axisVector(upAxis, displayMesh.matrixWorld)
  let normal = axisVector(normalAxis, displayMesh.matrixWorld)
  if (normal.dot(new THREE.Vector3().subVectors(referenceCameraPosition, center)) < 0) normal.negate()
  if (right.clone().cross(up).dot(normal) < 0) right.negate()
  if (up.y < 0) up.negate()
  const width = ranked[0].value
  const height = ranked[1].value
  const thickness = ranked[2].value
  const corners = [
    center.clone().addScaledVector(right, -width / 2).addScaledVector(up, height / 2),
    center.clone().addScaledVector(right, width / 2).addScaledVector(up, height / 2),
    center.clone().addScaledVector(right, width / 2).addScaledVector(up, -height / 2),
    center.clone().addScaledVector(right, -width / 2).addScaledVector(up, -height / 2),
  ]
  return { center, corners, height, normal, right, thickness, up, width }
}

function projectedRecord(frame, camera, viewport) {
  const projected = frame.corners.map((corner) => corner.clone().project(camera))
  const xs = projected.map(({ x }) => x)
  const ys = projected.map(({ y }) => y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const leftHeight = Math.abs(projected[3].y - projected[0].y)
  const rightHeight = Math.abs(projected[2].y - projected[1].y)
  const screenCorners = projected.map(({ x, y }) => ({
    x: (x * 0.5 + 0.5) * viewport.width,
    y: (-y * 0.5 + 0.5) * viewport.height,
  }))
  const polygonAreaPx = Math.abs(screenCorners.reduce((area, point, index) => {
    const next = screenCorners[(index + 1) % screenCorners.length]
    return area + point.x * next.y - next.x * point.y
  }, 0)) / 2
  return {
    widthRatio: (maxX - minX) / 2,
    heightRatio: (maxY - minY) / 2,
    widthPx: ((maxX - minX) / 2) * viewport.width,
    heightPx: ((maxY - minY) / 2) * viewport.height,
    skewRatio: Math.max(leftHeight, rightHeight) / Math.max(0.00001, Math.min(leftHeight, rightHeight)),
    corners: screenCorners,
    polygonAreaPx,
    viewportAreaRatio: polygonAreaPx / (viewport.width * viewport.height),
    ndc: { minX, maxX, minY, maxY },
  }
}

function solvePose(frame, camera, viewport) {
  const fov = STUDIO_V2_MACBOOK_FOCUS_CONFIG.fov
  const target = frame.center.clone().addScaledVector(frame.up, -frame.height * 0.015)
  const approach = frame.normal.clone()
    .addScaledVector(frame.right, 0.055)
    .addScaledVector(frame.up, 0.028)
    .normalize()
  const probe = camera.clone()
  probe.aspect = viewport.width / viewport.height
  probe.fov = fov
  probe.near = STUDIO_V2_MACBOOK_FOCUS_CONFIG.near
  probe.updateProjectionMatrix()
  let low = Math.max(frame.width * 0.55, 0.15)
  let high = Math.max(frame.width * 4, 1.25)
  for (let index = 0; index < 36; index += 1) {
    const distance = (low + high) / 2
    probe.position.copy(target).addScaledVector(approach, distance)
    probe.lookAt(target)
    probe.updateMatrixWorld(true)
    const widthRatio = projectedRecord(frame, probe, viewport).widthRatio
    if (widthRatio > STUDIO_V2_MACBOOK_FOCUS_CONFIG.occupancy) low = distance
    else high = distance
  }
  const distance = (low + high) / 2
  const position = target.clone().addScaledVector(approach, distance)
  probe.position.copy(position)
  probe.lookAt(target)
  probe.updateMatrixWorld(true)
  return {
    id: 'MACBOOK_FOCUS',
    state: 'MACBOOK_FOCUS',
    position: position.toArray(),
    target: target.toArray(),
    fov,
    near: STUDIO_V2_MACBOOK_FOCUS_CONFIG.near,
    far: camera.far,
    projection: projectedRecord(frame, probe, viewport),
    distance,
    intermediatePosition: target.clone()
      .addScaledVector(frame.normal, Math.max(distance * 1.75, 0.62))
      .addScaledVector(frame.up, 0.48)
      .toArray(),
  }
}

function findDisplayMesh(macbookRoot) {
  let exact = null
  macbookRoot?.traverse((object) => {
    if (object.isMesh && object.name === 'Object_6') exact = object
  })
  return exact
}

export function createStudioV2MacbookFocus({
  camera,
  cameraDirector,
  domElement,
  getRadioState = () => null,
  macbookRoot,
  renderSize,
  tableTarget,
}) {
  const displayMesh = findDisplayMesh(macbookRoot)
  if (!displayMesh) throw new Error('MACBOOK_DISPLAY_TARGET semantic mesh Object_6 was not found.')
  displayMesh.userData.studioV2SemanticId = 'MACBOOK_DISPLAY_TARGET'
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let pointerIntent = null
  let disposed = false
  let lastRequest = 'NONE'
  let reducedMotionOverride = 'AUTO'
  const listeners = new Set()
  const referenceCameraPosition = new THREE.Vector3().fromArray(STUDIO_V2_TABLE_OVERVIEW_POSE.position)

  function frame() {
    macbookRoot.updateWorldMatrix(true, true)
    return semanticDisplayFrame(displayMesh, referenceCameraPosition)
  }

  function currentPose() {
    return solvePose(frame(), camera, renderSize())
  }

  function publish() {
    const next = focusState()
    listeners.forEach((listener) => listener(next))
    return next
  }

  function focusState() {
    return {
      ...cameraDirector.getMacbookFocusState(),
      semanticTarget: 'MACBOOK_DISPLAY_TARGET',
      meshName: displayMesh.name,
      lastRequest,
      reducedMotionOverride,
    }
  }

  function hit(event, target = macbookRoot) {
    const rect = domElement.getBoundingClientRect()
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.setFromCamera(pointer, camera)
    return raycaster.intersectObject(target, true).length > 0
  }

  function tableHit(event) {
    return Boolean(tableTarget && hit(event, tableTarget))
  }

  function canEnter() {
    const state = cameraDirector.getCurrentState()
    const radioOpen = Boolean(getRadioState()?.screenPlayerOpen)
    return !radioOpen && [
      'ROOM_WIDE_START', 'AMBIENT_DRIFT', 'AMBIENT_USER_OVERRIDE', 'TABLE_SKIP_TRANSITION',
      'TABLE_OVERVIEW', 'TABLE_FREE_ORBIT', 'ROOM_ORBIT',
    ].includes(state)
  }

  function requestFocus(source = 'API') {
    if (!canEnter()) {
      lastRequest = getRadioState()?.screenPlayerOpen ? 'BLOCKED_RADIO_OPEN' : 'BLOCKED_CAMERA_STATE'
      return false
    }
    const pose = currentPose()
    const accepted = cameraDirector.requestMacbookFocus(pose, {
      reducedMotionOverride,
      source,
      intermediatePosition: pose.intermediatePosition,
      focusSafety: {
        macbookBounds: (() => {
          const bounds = new THREE.Box3().setFromObject(macbookRoot)
          return { min: bounds.min.toArray(), max: bounds.max.toArray() }
        })(),
        tableY: 1.415,
      },
    })
    lastRequest = accepted ? `ENTER:${source}` : 'REJECTED_BY_DIRECTOR'
    publish()
    return accepted
  }

  function closeFocus(source = 'API') {
    const accepted = cameraDirector.closeMacbookFocus({ reducedMotionOverride, source })
    if (accepted) lastRequest = `EXIT:${source}`
    publish()
    return accepted
  }

  function onPointerDown(event) {
    if (event.button !== 0 && event.pointerType !== 'touch') return
    const state = cameraDirector.getCurrentState()
    const focusOwned = state.startsWith('MACBOOK_')
    pointerIntent = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      downOnMacbook: !focusOwned && canEnter() && hit(event),
      downOnTable: !focusOwned && ['ROOM_WIDE_START', 'AMBIENT_DRIFT', 'AMBIENT_USER_OVERRIDE']
        .includes(state) && tableHit(event),
      focusOwned,
    }
  }

  function onPointerMove(event) {
    if (!pointerIntent || pointerIntent.id !== event.pointerId) return
    const distance = Math.hypot(event.clientX - pointerIntent.x, event.clientY - pointerIntent.y)
    if (distance > STUDIO_V2_MACBOOK_FOCUS_CONFIG.clickTolerancePx) pointerIntent.moved = true
  }

  function onPointerUp(event) {
    if (!pointerIntent || pointerIntent.id !== event.pointerId) return
    const intent = pointerIntent
    pointerIntent = null
    if (intent.moved) return
    if (intent.focusOwned) {
      if (!hit(event, displayMesh)) closeFocus('OUTSIDE_CLICK')
      return
    }
    if (intent.downOnMacbook && hit(event)) {
      requestFocus(event.pointerType === 'touch' ? 'TOUCH' : 'CLICK')
      return
    }
    if (intent.downOnTable && tableHit(event)) {
      const accepted = cameraDirector.requestTableSkip({ reducedMotionOverride })
      lastRequest = accepted ? 'TABLE_SKIP' : 'TABLE_SKIP_REJECTED'
      publish()
    }
  }

  function onKeyDown(event) {
    if (event.key === 'Escape') closeFocus('ESCAPE')
  }

  domElement.addEventListener('pointerdown', onPointerDown, true)
  domElement.addEventListener('pointermove', onPointerMove, true)
  window.addEventListener('pointerup', onPointerUp, true)
  window.addEventListener('pointercancel', onPointerUp, true)
  window.addEventListener('keydown', onKeyDown, true)

  cameraDirector.configureMacbookFocus({ solvePose: currentPose })

  return Object.freeze({
    closeFocus,
    dispose() {
      if (disposed) return
      disposed = true
      domElement.removeEventListener('pointerdown', onPointerDown, true)
      domElement.removeEventListener('pointermove', onPointerMove, true)
      window.removeEventListener('pointerup', onPointerUp, true)
      window.removeEventListener('pointercancel', onPointerUp, true)
      window.removeEventListener('keydown', onKeyDown, true)
      listeners.clear()
    },
    getContract() {
      const semantic = frame()
      const pose = currentPose()
      return {
        id: 'MACBOOK_DISPLAY_TARGET',
        meshName: displayMesh.name,
        center: vectorRecord(semantic.center),
        corners: semantic.corners.map((corner) => vectorRecord(corner)),
        normal: vectorRecord(semantic.normal),
        right: vectorRecord(semantic.right),
        up: vectorRecord(semantic.up),
        worldWidth: round(semantic.width),
        worldHeight: round(semantic.height),
        worldThickness: round(semantic.thickness),
        targetOccupancy: STUDIO_V2_MACBOOK_FOCUS_CONFIG.occupancy,
        tableInteractionTarget: tableTarget?.userData?.studioV2SemanticId ?? null,
        solvedPose: {
          position: pose.position.map((value) => round(value)),
          target: pose.target.map((value) => round(value)),
          fov: pose.fov,
          near: pose.near,
          distance: round(pose.distance),
          projection: Object.fromEntries(Object.entries(pose.projection).map(([key, value]) => [
            key,
            typeof value === 'number' ? round(value) : value,
          ])),
        },
        screenSpaceQuad: pose.projection.corners.map(({ x, y }) => ({ x: round(x, 3), y: round(y, 3) })),
        focusActive: cameraDirector.getCurrentState() === 'MACBOOK_FOCUS',
        focusTransitionProgress: cameraDirector.getMacbookFocusState().transitionProgress,
        screenInteractionEnabled: cameraDirector.getMacbookFocusState().screenInteractionEnabled,
        events: Object.freeze(['focus-requested', 'focus-ready', 'focus-exit-requested', 'focus-closed']),
      }
    },
    getState() {
      return focusState()
    },
    getProjection() {
      return currentPose().projection
    },
    refresh() {
      return cameraDirector.refreshMacbookFocus()
    },
    requestFocus,
    setReducedMotionOverride(mode) {
      if (!['AUTO', 'REDUCE', 'ALLOW'].includes(mode)) return reducedMotionOverride
      reducedMotionOverride = mode
      publish()
      return reducedMotionOverride
    },
    subscribe(listener) {
      listeners.add(listener)
      listener(focusState())
      return () => listeners.delete(listener)
    },
  })
}
