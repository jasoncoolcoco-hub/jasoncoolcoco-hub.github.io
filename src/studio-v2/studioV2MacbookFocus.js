import * as THREE from 'three'
import { STUDIO_V2_TABLE_OVERVIEW_POSE } from './studioV2CameraPoses'

export const STUDIO_V2_MACBOOK_FOCUS_CONFIG = Object.freeze({
  chromeDockCenterX: 0.693,
  chromeDockCenterY: 0.875,
  chromeHoverScale: 1.06,
  chromeIconSize: 0.022,
  chromeLaunchDurationMs: 160,
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

function localCoordinate(vector, axis) {
  return axis === 0 ? vector.x : axis === 1 ? vector.y : vector.z
}

function setLocalCoordinate(vector, axis, value) {
  if (axis === 0) vector.x = value
  else if (axis === 1) vector.y = value
  else vector.z = value
}

function chromeIconTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')
  context.translate(64, 64)
  const wedges = [
    { color: '#ea4335', end: -Math.PI / 6, start: -Math.PI * 5 / 6 },
    { color: '#fbbc05', end: Math.PI / 2, start: -Math.PI / 6 },
    { color: '#34a853', end: Math.PI * 7 / 6, start: Math.PI / 2 },
  ]
  wedges.forEach(({ color, end, start }) => {
    context.beginPath()
    context.moveTo(0, 0)
    context.arc(0, 0, 56, start, end)
    context.closePath()
    context.fillStyle = color
    context.fill()
  })
  context.beginPath()
  context.arc(0, 0, 27, 0, Math.PI * 2)
  context.fillStyle = '#f5f5f5'
  context.fill()
  context.beginPath()
  context.arc(0, 0, 22, 0, Math.PI * 2)
  context.fillStyle = '#4285f4'
  context.fill()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.name = 'StudioV2MacbookChromeDockIcon'
  texture.needsUpdate = true
  return texture
}

function planeGeometryAt({
  bounds,
  centerX,
  centerY,
  horizontalAxis,
  horizontalSign,
  normalAxis,
  normalSign,
  size,
  verticalAxis,
  verticalSign,
}) {
  const localSize = bounds.getSize(new THREE.Vector3())
  const center = bounds.getCenter(new THREE.Vector3())
  const horizontalPosition = horizontalSign > 0 ? centerX : 1 - centerX
  setLocalCoordinate(
    center,
    horizontalAxis,
    localCoordinate(bounds.min, horizontalAxis)
      + localCoordinate(localSize, horizontalAxis) * horizontalPosition,
  )
  setLocalCoordinate(
    center,
    verticalAxis,
    localCoordinate(bounds.max, verticalAxis)
      - localCoordinate(localSize, verticalAxis) * centerY * verticalSign,
  )
  if (verticalSign < 0) {
    setLocalCoordinate(
      center,
      verticalAxis,
      localCoordinate(bounds.min, verticalAxis)
        + localCoordinate(localSize, verticalAxis) * centerY,
    )
  }
  const depthInset = Math.max(localCoordinate(localSize, normalAxis) * 0.03, 0.00003)
  setLocalCoordinate(
    center,
    normalAxis,
    (normalSign > 0 ? localCoordinate(bounds.max, normalAxis) : localCoordinate(bounds.min, normalAxis))
      + depthInset * normalSign,
  )
  const half = localCoordinate(localSize, horizontalAxis) * size / 2
  const verticalHalf = half
  const corners = [
    [-1, 1],
    [1, 1],
    [1, -1],
    [-1, -1],
  ].map(([horizontal, vertical]) => {
    const point = center.clone()
    setLocalCoordinate(
      point,
      horizontalAxis,
      localCoordinate(center, horizontalAxis) + horizontal * horizontalSign * half,
    )
    setLocalCoordinate(
      point,
      verticalAxis,
      localCoordinate(center, verticalAxis) + vertical * verticalSign * verticalHalf,
    )
    return point
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(corners.flatMap((point) => point.toArray()), 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
    0, 1,
    1, 1,
    1, 0,
    0, 0,
  ], 2))
  geometry.setIndex([0, 2, 1, 0, 3, 2])
  geometry.computeVertexNormals()
  return geometry
}

function createChromeDockInteraction(displayMesh) {
  displayMesh.geometry.computeBoundingBox()
  displayMesh.updateWorldMatrix(true, false)
  const bounds = displayMesh.geometry.boundingBox.clone()
  const localSize = bounds.getSize(new THREE.Vector3())
  const worldScale = displayMesh.getWorldScale(new THREE.Vector3())
  const dimensions = [
    Math.abs(localSize.x * worldScale.x),
    Math.abs(localSize.y * worldScale.y),
    Math.abs(localSize.z * worldScale.z),
  ]
  const ranked = dimensions.map((value, index) => ({ index, value })).sort((a, b) => b.value - a.value)
  const horizontalAxis = ranked[0].index
  const verticalAxis = ranked[1].index
  const normalAxis = ranked[2].index
  const center = bounds.getCenter(new THREE.Vector3()).applyMatrix4(displayMesh.matrixWorld)
  const horizontalBasis = axisVector(horizontalAxis, displayMesh.matrixWorld)
  const verticalBasis = axisVector(verticalAxis, displayMesh.matrixWorld)
  const normalBasis = axisVector(normalAxis, displayMesh.matrixWorld)
  const referenceCamera = new THREE.Vector3().fromArray(STUDIO_V2_TABLE_OVERVIEW_POSE.position)
  let horizontalSign = 1
  let verticalSign = verticalBasis.y < 0 ? -1 : 1
  let normalSign = 1
  const up = verticalBasis.clone().multiplyScalar(verticalSign)
  const normal = normalBasis.clone()
  if (normal.dot(referenceCamera.sub(center)) < 0) {
    normal.negate()
    normalSign = -1
  }
  if (horizontalBasis.clone().cross(up).dot(normal) < 0) horizontalSign = -1
  const geometryOptions = {
    bounds,
    centerX: STUDIO_V2_MACBOOK_FOCUS_CONFIG.chromeDockCenterX,
    centerY: STUDIO_V2_MACBOOK_FOCUS_CONFIG.chromeDockCenterY,
    horizontalAxis,
    horizontalSign,
    normalAxis,
    normalSign,
    verticalAxis,
    verticalSign,
  }
  const iconTexture = chromeIconTexture()
  const iconMaterial = new THREE.MeshBasicMaterial({
    map: iconTexture,
    opacity: 1,
    side: THREE.DoubleSide,
    toneMapped: false,
    transparent: true,
  })
  iconMaterial.depthWrite = false
  iconMaterial.name = 'StudioV2ChromeDockIconMaterial'
  const iconGeometry = planeGeometryAt({
    ...geometryOptions,
    size: STUDIO_V2_MACBOOK_FOCUS_CONFIG.chromeIconSize,
  })
  iconGeometry.computeBoundingBox()
  const iconCenter = iconGeometry.boundingBox.getCenter(new THREE.Vector3())
  iconGeometry.translate(-iconCenter.x, -iconCenter.y, -iconCenter.z)
  const icon = new THREE.Mesh(iconGeometry, iconMaterial)
  icon.position.copy(iconCenter)
  icon.name = 'STUDIO_V2_CHROME_DOCK_ICON'
  icon.renderOrder = 16
  const hitMaterial = new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthWrite: false,
    opacity: 0,
    side: THREE.DoubleSide,
    transparent: true,
  })
  const hitTarget = new THREE.Mesh(iconGeometry.clone(), hitMaterial)
  hitTarget.position.copy(iconCenter)
  hitTarget.name = 'STUDIO_V2_CHROME_DOCK_TARGET'
  hitTarget.userData.studioV2SemanticId = 'MACBOOK_CHROME_DOCK_TARGET'
  displayMesh.add(icon, hitTarget)
  return {
    dispose() {
      displayMesh.remove(icon, hitTarget)
      icon.geometry.dispose()
      iconMaterial.dispose()
      iconTexture.dispose()
      hitTarget.geometry.dispose()
      hitMaterial.dispose()
    },
    hitTarget,
    icon,
    iconMaterial,
  }
}

export function createStudioV2MacbookFocus({
  camera,
  cameraDirector,
  domElement,
  getRadioState = () => null,
  isInteractionLocked = () => false,
  macbookRoot,
  renderSize,
  tableTarget,
}) {
  const displayMesh = findDisplayMesh(macbookRoot)
  if (!displayMesh) throw new Error('MACBOOK_DISPLAY_TARGET semantic mesh Object_6 was not found.')
  displayMesh.userData.studioV2SemanticId = 'MACBOOK_DISPLAY_TARGET'
  const chromeDock = createChromeDockInteraction(displayMesh)
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let pointerIntent = null
  let disposed = false
  let chromeHovered = false
  let chromeLaunchStartedAt = -Infinity
  let chromeScale = 1
  let chromeUpdateAt = performance.now()
  let lastRequest = 'NONE'
  let reducedMotionOverride = 'AUTO'
  const listeners = new Set()
  const portalOpenListeners = new Set()
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
      chromeHovered,
      chromeLaunchActive: performance.now() - chromeLaunchStartedAt
        < STUDIO_V2_MACBOOK_FOCUS_CONFIG.chromeLaunchDurationMs,
      chromeTarget: 'MACBOOK_CHROME_DOCK_TARGET',
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

  function chromeHit(event) {
    return hit(event, chromeDock.hitTarget)
  }

  function chromeProjection() {
    chromeDock.hitTarget.updateWorldMatrix(true, false)
    camera.updateMatrixWorld(true)
    const viewport = renderSize()
    const position = chromeDock.hitTarget.geometry.getAttribute('position')
    const corners = [0, 1, 2, 3].map((index) => {
      const projected = new THREE.Vector3(
        position.getX(index),
        position.getY(index),
        position.getZ(index),
      ).applyMatrix4(chromeDock.hitTarget.matrixWorld).project(camera)
      return {
        x: (projected.x * 0.5 + 0.5) * viewport.width,
        y: (-projected.y * 0.5 + 0.5) * viewport.height,
      }
    })
    return { corners }
  }

  function setChromeHovered(next) {
    const allowed = !isInteractionLocked() && cameraDirector.getCurrentState() === 'MACBOOK_FOCUS'
    chromeHovered = Boolean(next && allowed)
    domElement.style.cursor = chromeHovered ? 'pointer' : ''
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
    if (isInteractionLocked()) {
      lastRequest = 'BLOCKED_MACBOOK_SITE_MODE'
      publish()
      return false
    }
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
    if (isInteractionLocked()) {
      lastRequest = 'BLOCKED_MACBOOK_SITE_MODE'
      publish()
      return false
    }
    const accepted = cameraDirector.closeMacbookFocus({ reducedMotionOverride, source })
    if (accepted) lastRequest = `EXIT:${source}`
    publish()
    return accepted
  }

  function requestPortalOpen(source = 'API') {
    if (isInteractionLocked() || cameraDirector.getCurrentState() !== 'MACBOOK_FOCUS') return false
    chromeLaunchStartedAt = performance.now()
    setChromeHovered(false)
    lastRequest = `PORTAL:${source}`
    portalOpenListeners.forEach((listener) => listener({
      launchDurationMs: STUDIO_V2_MACBOOK_FOCUS_CONFIG.chromeLaunchDurationMs,
      source,
      state: 'MACBOOK_FOCUS',
    }))
    publish()
    return true
  }

  function onPointerDown(event) {
    if (event.button !== 0 && event.pointerType !== 'touch') return
    if (isInteractionLocked()) {
      pointerIntent = null
      return
    }
    const state = cameraDirector.getCurrentState()
    const focusOwned = state.startsWith('MACBOOK_')
    pointerIntent = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      downOnMacbook: !focusOwned && canEnter() && hit(event),
      downOnChrome: focusOwned && chromeHit(event),
      downOnTable: !focusOwned && ['ROOM_WIDE_START', 'AMBIENT_DRIFT', 'AMBIENT_USER_OVERRIDE']
        .includes(state) && tableHit(event),
      focusOwned,
    }
  }

  function onPointerMove(event) {
    setChromeHovered(chromeHit(event))
    if (!pointerIntent || pointerIntent.id !== event.pointerId) return
    const distance = Math.hypot(event.clientX - pointerIntent.x, event.clientY - pointerIntent.y)
    if (distance > STUDIO_V2_MACBOOK_FOCUS_CONFIG.clickTolerancePx) pointerIntent.moved = true
  }

  function onPointerUp(event) {
    if (isInteractionLocked()) {
      pointerIntent = null
      return
    }
    if (!pointerIntent || pointerIntent.id !== event.pointerId) return
    const intent = pointerIntent
    pointerIntent = null
    if (intent.moved) return
    if (intent.focusOwned) {
      if (intent.downOnChrome && chromeHit(event)) {
        requestPortalOpen(event.pointerType === 'touch' ? 'CHROME_TOUCH' : 'CHROME_CLICK')
      } else if (!hit(event, displayMesh)) closeFocus('OUTSIDE_CLICK')
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
    if (isInteractionLocked()) return
    if (event.key === 'Escape') closeFocus('ESCAPE')
  }

  function onPointerLeave() {
    setChromeHovered(false)
  }

  domElement.addEventListener('pointerdown', onPointerDown, true)
  domElement.addEventListener('pointermove', onPointerMove, true)
  domElement.addEventListener('pointerleave', onPointerLeave, true)
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
      domElement.removeEventListener('pointerleave', onPointerLeave, true)
      window.removeEventListener('pointerup', onPointerUp, true)
      window.removeEventListener('pointercancel', onPointerUp, true)
      window.removeEventListener('keydown', onKeyDown, true)
      listeners.clear()
      portalOpenListeners.clear()
      domElement.style.cursor = ''
      chromeDock.dispose()
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
    getChromeProjection() {
      return chromeProjection()
    },
    getProjection() {
      return currentPose().projection
    },
    refresh() {
      return cameraDirector.refreshMacbookFocus()
    },
    requestPortalOpen,
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
    subscribePortalOpen(listener) {
      portalOpenListeners.add(listener)
      return () => portalOpenListeners.delete(listener)
    },
    update(time = performance.now()) {
      if (cameraDirector.getCurrentState() !== 'MACBOOK_FOCUS' || isInteractionLocked()) {
        setChromeHovered(false)
      }
      const launchProgress = Math.min(
        1,
        Math.max(0, (time - chromeLaunchStartedAt) / STUDIO_V2_MACBOOK_FOCUS_CONFIG.chromeLaunchDurationMs),
      )
      const launching = launchProgress < 1
      const launchLift = launching ? Math.sin(launchProgress * Math.PI) * 0.12 : 0
      const targetScale = 1 + launchLift
        + (chromeHovered && !launching ? STUDIO_V2_MACBOOK_FOCUS_CONFIG.chromeHoverScale - 1 : 0)
      const elapsed = Math.min(48, Math.max(0, time - chromeUpdateAt))
      chromeUpdateAt = time
      chromeScale += (targetScale - chromeScale) * (1 - Math.exp(-elapsed / 42))
      chromeDock.icon.scale.setScalar(chromeScale)
      chromeDock.hitTarget.scale.setScalar(chromeScale)
      domElement.style.cursor = chromeHovered ? 'pointer' : ''
      return { chromeHovered, chromeScale, launching }
    },
  })
}
