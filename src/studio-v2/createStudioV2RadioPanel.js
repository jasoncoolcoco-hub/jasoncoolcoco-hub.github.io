import * as THREE from 'three'
import {
  STUDIO_V2_RADIO_PANEL_DIMENSIONS,
  STUDIO_V2_RADIO_PANEL_ID,
  STUDIO_V2_RADIO_PANEL_MATERIAL,
  STUDIO_V2_RADIO_PANEL_TRANSFORM,
} from './studioV2RadioPanelConfig'

const COMPACT_CANVAS_WIDTH = 2048
const COMPACT_CANVAS_HEIGHT = 778
const POINTER_MOVEMENT_LIMIT = 6
const POINTER_DURATION_LIMIT_MS = 600
const FRONT_OFFSET = STUDIO_V2_RADIO_PANEL_DIMENSIONS.thickness / 2 + 0.00015
const AXES = Object.freeze(['x', 'y', 'z'])

function rounded(values, digits = 4) {
  return values.map((value) => Number(value.toFixed(digits)))
}

function enabledTracks(audioState) {
  return (audioState?.tracks ?? []).filter(({ enabled }) => enabled)
}

function currentTrack(audioState) {
  const tracks = enabledTracks(audioState)
  const selectedId = audioState?.trackId ?? audioState?.defaultTrackId
  return tracks.find(({ id }) => id === selectedId) ?? tracks[0] ?? null
}

function playbackLabel(status) {
  if (status === 'playing') return 'PLAYING'
  if (status === 'paused') return 'PAUSED'
  return 'IDLE'
}

function fitText(context, text, maximumWidth, initialSize, weight = 600) {
  let size = initialSize
  do {
    context.font = `${weight} ${size}px "Helvetica Neue", Arial, sans-serif`
    if (context.measureText(text).width <= maximumWidth) return size
    size -= 4
  } while (size >= 36)
  return size
}

function createCanvasTexture(renderer) {
  const canvas = document.createElement('canvas')
  canvas.width = COMPACT_CANVAS_WIDTH
  canvas.height = COMPACT_CANVAS_HEIGHT
  const texture = new THREE.CanvasTexture(canvas)
  texture.name = `${STUDIO_V2_RADIO_PANEL_ID}_COMPACT_${canvas.width}x${canvas.height}`
  texture.colorSpace = THREE.SRGBColorSpace
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  return { canvas, context: canvas.getContext('2d'), texture }
}

function drawCompactSurface(surface, audioState) {
  const { canvas, context, texture } = surface
  context.clearRect(0, 0, canvas.width, canvas.height)

  const wash = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  wash.addColorStop(0, 'rgba(21, 32, 35, 0.36)')
  wash.addColorStop(0.54, 'rgba(8, 14, 16, 0.21)')
  wash.addColorStop(1, 'rgba(4, 8, 10, 0.12)')
  context.fillStyle = wash
  context.fillRect(0, 0, canvas.width, canvas.height)

  const edge = context.createLinearGradient(0, 0, canvas.width, canvas.height)
  edge.addColorStop(0, 'rgba(241, 248, 246, 0.58)')
  edge.addColorStop(0.38, 'rgba(219, 230, 227, 0.23)')
  edge.addColorStop(1, 'rgba(192, 207, 203, 0.38)')
  context.strokeStyle = edge
  context.lineWidth = 5
  context.strokeRect(7, 7, canvas.width - 14, canvas.height - 14)
  context.strokeStyle = 'rgba(218, 229, 226, 0.14)'
  context.lineWidth = 2
  context.strokeRect(19, 19, canvas.width - 38, canvas.height - 38)

  const track = currentTrack(audioState)
  const metadataUnavailable = ['error', 'empty'].includes(audioState?.catalogueStatus)
  const policyBlocked = audioState?.entryStatus === 'waiting-for-gesture'
  const title = metadataUnavailable ? 'Audio unavailable' : track?.title ?? 'Radio ready'
  const artist = metadataUnavailable
    ? ''
    : policyBlocked
      ? 'TAP TO START AUDIO'
      : track?.artist ?? ''
  const icon = audioState?.status === 'playing' ? 'Ⅱ' : '▶'
  const pad = 88

  context.textBaseline = 'alphabetic'
  context.fillStyle = 'rgba(230, 238, 235, 0.88)'
  context.font = '600 78px "Helvetica Neue", Arial, sans-serif'
  context.letterSpacing = '7px'
  context.fillText('FRED STUDIO RADIO', pad, 132)
  context.letterSpacing = '0px'

  fitText(context, title, canvas.width - pad * 2 - 250, 176, 620)
  context.fillStyle = 'rgba(252, 253, 250, 0.99)'
  context.fillText(title, pad, 444)

  if (artist) {
    fitText(context, artist, canvas.width - pad * 2 - 280, 96, 430)
    context.fillStyle = 'rgba(220, 229, 225, 0.87)'
    context.fillText(artist, pad, 608)
  }

  context.textAlign = 'center'
  context.font = '400 118px "Helvetica Neue", Arial, sans-serif'
  context.fillStyle = audioState?.status === 'playing'
    ? 'rgba(248, 251, 246, 0.98)'
    : 'rgba(226, 234, 230, 0.86)'
  context.fillText(icon, canvas.width - 158, 500)
  context.textAlign = 'left'
  texture.needsUpdate = true
}

function projectedBounds(group, dimensions, camera, domElement) {
  if (!camera || !domElement?.isConnected) return null
  group.updateWorldMatrix(true, false)
  camera.updateMatrixWorld(true)
  const rect = domElement.getBoundingClientRect()
  const z = FRONT_OFFSET
  const localCorners = [
    new THREE.Vector3(-dimensions.width / 2, 0, z),
    new THREE.Vector3(dimensions.width / 2, 0, z),
    new THREE.Vector3(dimensions.width / 2, -dimensions.compactHeight, z),
    new THREE.Vector3(-dimensions.width / 2, -dimensions.compactHeight, z),
  ]
  const points = localCorners.map((point) => {
    point.applyMatrix4(group.matrixWorld).project(camera)
    return {
      x: rect.left + (point.x + 1) * rect.width / 2,
      y: rect.top + (1 - point.y) * rect.height / 2,
      z: point.z,
    }
  })
  const xs = points.map(({ x }) => x)
  const ys = points.map(({ y }) => y)
  const left = Math.min(...xs)
  const top = Math.min(...ys)
  const right = Math.max(...xs)
  const bottom = Math.max(...ys)
  const topEdgeAngle = Math.atan2(points[1].y - points[0].y, points[1].x - points[0].x)
  return Object.freeze({
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
    right,
    bottom,
    rotationDegrees: THREE.MathUtils.radToDeg(topEdgeAngle),
    visible: points.every(({ z }) => z >= -1 && z <= 1),
    corners: points.map(({ x, y, z: depth }) => rounded([x, y, depth], 2)),
  })
}

function disposeMaterial(material) {
  material.map?.dispose?.()
  material.dispose?.()
}

export function createStudioV2RadioPanel({
  audioController,
  controls,
  domElement,
  onOpenRequest,
  orbitController,
  parent,
  renderer,
  metadataReadyAtMs = null,
  startedAt = performance.now(),
} = {}) {
  const dimensions = STUDIO_V2_RADIO_PANEL_DIMENSIONS
  const transform = STUDIO_V2_RADIO_PANEL_TRANSFORM
  const group = new THREE.Group()
  group.name = STUDIO_V2_RADIO_PANEL_ID
  group.userData.studioV2Id = STUDIO_V2_RADIO_PANEL_ID
  group.position.fromArray(transform.position)
  group.rotation.fromArray(transform.rotation)
  group.scale.setScalar(transform.scale)

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    ...STUDIO_V2_RADIO_PANEL_MATERIAL,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  glassMaterial.name = 'StudioV2RadioSmokedGlassV2'
  glassMaterial.forceSinglePass = true
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), glassMaterial)
  glass.name = `${STUDIO_V2_RADIO_PANEL_ID}_GLASS`
  glass.castShadow = false
  glass.receiveShadow = false
  glass.scale.set(dimensions.width, dimensions.compactHeight, dimensions.thickness)
  glass.position.set(0, -dimensions.compactHeight / 2, 0)
  glass.renderOrder = 1
  group.add(glass)

  const compactSurface = createCanvasTexture(renderer)
  const compactMaterial = new THREE.MeshBasicMaterial({
    map: compactSurface.texture,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    toneMapped: false,
  })
  compactMaterial.name = 'StudioV2RadioCompactUIV2'
  const compactMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), compactMaterial)
  compactMesh.name = `${STUDIO_V2_RADIO_PANEL_ID}_COMPACT_UI`
  compactMesh.castShadow = false
  compactMesh.receiveShadow = false
  compactMesh.scale.set(dimensions.width, dimensions.compactHeight, 1)
  compactMesh.position.set(0, -dimensions.compactHeight / 2, FRONT_OFFSET)
  compactMesh.renderOrder = 2
  group.add(compactMesh)
  parent.add(group)

  const listeners = new Set()
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let activeCamera = null
  let audioState = audioController?.getState?.() ?? {}
  let activePointer = null
  let disposed = false
  let hover = false
  let redraws = 0
  let renderKey = ''
  let uiReadyAtMs = null
  let screenPlayerOpen = false
  let transitionState = 'WORLD_COMPACT'
  let projectedStartBounds = null
  let projectedReturnBounds = null
  let finalDomBounds = null
  let catalogueFixtureCount = null
  let outsideClickState = 'IDLE'
  let transitionSpeed = 1
  let handoffMode = 'WORLD_COMPACT'
  let worldFaceOpacity = 1
  let worldGlassOpacity = 1
  let worldLayerFrame = null
  let handoffFrameTiming = Object.freeze({})

  function compactVisibilityMode() {
    if (transitionState === 'WORLD_COMPACT') return 'COMPACT_VISIBLE'
    if (['OPENING_REQUESTED', 'WORLD_COMPACT_EXIT'].includes(transitionState)) return 'COMPACT_EXITING'
    if (transitionState === 'WORLD_COMPACT_ENTER') return 'COMPACT_ENTERING'
    return 'COMPACT_FACE_SUPPRESSED'
  }

  function applyCompactVisibility() {
    const compactVisible = compactVisibilityMode() !== 'COMPACT_FACE_SUPPRESSED'
    compactMesh.visible = compactVisible
    glass.visible = compactVisible
    compactMaterial.opacity = worldFaceOpacity
    glassMaterial.opacity = STUDIO_V2_RADIO_PANEL_MATERIAL.opacity * worldGlassOpacity
  }

  function cancelWorldLayerAnimation() {
    if (worldLayerFrame === null) return
    cancelAnimationFrame(worldLayerFrame)
    worldLayerFrame = null
  }

  function animateWorldLayers({ faceOpacity = worldFaceOpacity, glassOpacity = worldGlassOpacity, durationMs = 0 } = {}) {
    cancelWorldLayerAnimation()
    const startFaceOpacity = worldFaceOpacity
    const startGlassOpacity = worldGlassOpacity
    const targetFaceOpacity = THREE.MathUtils.clamp(Number(faceOpacity), 0, 1)
    const targetGlassOpacity = THREE.MathUtils.clamp(Number(glassOpacity), 0, 1)
    const duration = Math.max(0, Number(durationMs) || 0)
    const startedAt = performance.now()

    compactMesh.visible = true
    glass.visible = true

    const update = (now) => {
      const progress = duration === 0 ? 1 : Math.min(1, (now - startedAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      worldFaceOpacity = THREE.MathUtils.lerp(startFaceOpacity, targetFaceOpacity, eased)
      worldGlassOpacity = THREE.MathUtils.lerp(startGlassOpacity, targetGlassOpacity, eased)
      applyCompactVisibility()
      if (progress < 1) {
        worldLayerFrame = requestAnimationFrame(update)
        return
      }
      worldLayerFrame = null
      worldFaceOpacity = targetFaceOpacity
      worldGlassOpacity = targetGlassOpacity
      applyCompactVisibility()
      publish()
    }

    if (duration === 0) update(startedAt)
    else worldLayerFrame = requestAnimationFrame(update)
    return snapshot()
  }

  function project() {
    return projectedBounds(group, dimensions, activeCamera, domElement)
  }

  function snapshot() {
    const selected = currentTrack(audioState)
    const rotation = [group.rotation.x, group.rotation.y, group.rotation.z]
    return Object.freeze({
      semanticId: STUDIO_V2_RADIO_PANEL_ID,
      position: rounded(group.position.toArray()),
      rotation: rounded(rotation, 6),
      rotationDegrees: rounded(rotation.map(THREE.MathUtils.radToDeg), 3),
      compactDimensions: [dimensions.width, dimensions.compactHeight, dimensions.thickness],
      worldMode: compactVisibilityMode(),
      screenPlayerOpen,
      transitionState,
      compactVisibilityMode: compactVisibilityMode(),
      transitionProxyActive: !['WORLD_COMPACT', 'SCREEN_PLAYER_OPEN'].includes(transitionState),
      formalPlayerOpen: transitionState === 'SCREEN_PLAYER_OPEN',
      outsideClickState,
      transitionSpeed,
      handoffMode,
      worldCompactReady: Boolean(renderKey),
      worldLayerOpacity: Object.freeze({ face: worldFaceOpacity, glass: worldGlassOpacity }),
      handoffFrameTiming,
      panelState: screenPlayerOpen ? 'SCREEN_PLAYER' : `WORLD_COMPACT_${playbackLabel(audioState.status)}`,
      selectedTrackId: selected?.id ?? null,
      selectedTrackTitle: selected?.title ?? null,
      selectedTrackArtist: selected?.artist ?? null,
      selectedTrackVersion: selected?.version ?? null,
      catalogueTrackCount: enabledTracks(audioState).length,
      catalogueFixtureCount,
      catalogueMetadataReady: audioState.catalogueStatus === 'ready',
      catalogueStatus: audioState.catalogueStatus ?? 'idle',
      catalogueError: audioState.errorCode ?? audioState.error ?? null,
      panelReady: true,
      compactReadiness: 'READY',
      hover,
      panelDrawCalls: 2,
      panelTriangles: 14,
      metadataReadyAtMs,
      uiReadyAtMs,
      projectedScreenBounds: project(),
      projectedStartBounds,
      projectedReturnBounds,
      finalDomBounds,
      textureResolution: { compact: [COMPACT_CANVAS_WIDTH, COMPACT_CANVAS_HEIGHT] },
      textureRedraws: redraws,
      fixedWorldTransform: true,
      billboard: false,
    })
  }

  function publish() {
    const next = snapshot()
    listeners.forEach((listener) => listener(next))
    return next
  }

  function renderTexture({ force = false } = {}) {
    const nextKey = JSON.stringify({
      catalogueStatus: audioState.catalogueStatus,
      defaultTrackId: audioState.defaultTrackId,
      status: audioState.status,
      trackId: audioState.trackId,
      tracks: enabledTracks(audioState).map(({ id, title, artist }) => [id, title, artist]),
    })
    if (!force && nextKey === renderKey) return
    drawCompactSurface(compactSurface, audioState)
    renderKey = nextKey
    redraws += 1
  }

  function prepareCompactTexture() {
    renderTexture({ force: true })
    return publish()
  }

  function setScreenPlayerState(next = {}) {
    screenPlayerOpen = Boolean(next.open)
    transitionState = next.transitionState ?? (screenPlayerOpen ? 'SCREEN_PLAYER_OPEN' : 'WORLD_COMPACT')
    projectedStartBounds = next.projectedStartBounds ?? projectedStartBounds
    projectedReturnBounds = next.projectedReturnBounds ?? projectedReturnBounds
    finalDomBounds = next.finalDomBounds ?? finalDomBounds
    catalogueFixtureCount = next.catalogueFixtureCount ?? catalogueFixtureCount
    outsideClickState = next.outsideClickState ?? outsideClickState
    transitionSpeed = next.transitionSpeed ?? transitionSpeed
    handoffMode = next.handoffMode ?? handoffMode
    handoffFrameTiming = next.handoffFrameTiming
      ? Object.freeze({ ...handoffFrameTiming, ...next.handoffFrameTiming })
      : handoffFrameTiming
    applyCompactVisibility()
    return publish()
  }

  function openScreenPlayer() {
    if (screenPlayerOpen || disposed) return snapshot()
    screenPlayerOpen = true
    projectedStartBounds = project()
    transitionState = 'WORLD_COMPACT_EXIT'
    outsideClickState = 'ARMED'
    handoffMode = 'WORLD_COMPACT_EXIT'
    handoffFrameTiming = Object.freeze({})
    applyCompactVisibility()
    publish()
    onOpenRequest?.(projectedStartBounds)
    return snapshot()
  }

  function hitFromCamera(event) {
    if (!activeCamera) return null
    const rect = domElement.getBoundingClientRect()
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.setFromCamera(pointer, activeCamera)
    return raycaster.intersectObject(glass, false)[0] ?? null
  }

  function handlePointerMove(event) {
    if (disposed || !activeCamera || screenPlayerOpen) return
    if (activePointer?.id === event.pointerId) {
      activePointer.movement = Math.max(
        activePointer.movement,
        Math.hypot(event.clientX - activePointer.x, event.clientY - activePointer.y),
      )
      event.preventDefault()
      event.stopImmediatePropagation()
      return
    }
    const nextHover = Boolean(hitFromCamera(event))
    if (nextHover !== hover) {
      hover = nextHover
      publish()
    }
    if (nextHover) {
      domElement.style.cursor = 'pointer'
      event.stopImmediatePropagation()
    }
  }

  function handlePointerDown(event) {
    if (disposed || screenPlayerOpen || event.button !== 0 || !hitFromCamera(event)) return
    activePointer = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      startedAt: performance.now(),
      movement: 0,
      controlsEnabled: orbitController?.getEnabled?.() ?? controls.enabled,
    }
    if (orbitController) orbitController.setEnabled(false)
    else controls.enabled = false
    event.preventDefault()
    event.stopImmediatePropagation()
  }

  function handlePointerUp(event) {
    if (!activePointer || activePointer.id !== event.pointerId) return
    const pointerRecord = activePointer
    activePointer = null
    if (orbitController) orbitController.setEnabled(pointerRecord.controlsEnabled)
    else controls.enabled = pointerRecord.controlsEnabled
    const movement = Math.max(
      pointerRecord.movement,
      Math.hypot(event.clientX - pointerRecord.x, event.clientY - pointerRecord.y),
    )
    const duration = performance.now() - pointerRecord.startedAt
    if (hitFromCamera(event) && movement <= POINTER_MOVEMENT_LIMIT && duration <= POINTER_DURATION_LIMIT_MS) {
      openScreenPlayer()
    }
    event.preventDefault()
    event.stopImmediatePropagation()
  }

  function handlePointerCancel(event) {
    if (!activePointer) return
    if (orbitController) orbitController.setEnabled(activePointer.controlsEnabled)
    else controls.enabled = activePointer.controlsEnabled
    activePointer = null
    event.preventDefault()
    event.stopImmediatePropagation()
  }

  function setDebugPosition(axis, value) {
    const key = AXES[axis]
    if (!key || !Number.isFinite(Number(value))) return snapshot()
    group.position[key] = Number(value)
    group.updateMatrixWorld(true)
    return publish()
  }

  function setDebugRotationDegrees(axis, value) {
    const key = AXES[axis]
    if (!key || !Number.isFinite(Number(value))) return snapshot()
    group.rotation[key] = THREE.MathUtils.degToRad(Number(value))
    group.updateMatrixWorld(true)
    return publish()
  }

  function resetDebugTransform() {
    group.position.fromArray(transform.position)
    group.rotation.fromArray(transform.rotation)
    group.updateMatrixWorld(true)
    return publish()
  }

  const unsubscribeAudio = audioController?.subscribe?.((nextAudioState) => {
    audioState = nextAudioState
    renderTexture()
    publish()
  }) ?? (() => {})

  renderTexture({ force: true })
  uiReadyAtMs = Number((performance.now() - startedAt).toFixed(1))
  domElement.addEventListener('pointerdown', handlePointerDown, true)
  domElement.addEventListener('pointermove', handlePointerMove, true)
  domElement.addEventListener('pointerup', handlePointerUp, true)
  domElement.addEventListener('pointercancel', handlePointerCancel, true)
  domElement.addEventListener('pointerleave', handlePointerCancel, true)

  return Object.freeze({
    group,
    glass,
    dispose() {
      if (disposed) return
      disposed = true
      if (activePointer) {
        if (orbitController) orbitController.setEnabled(activePointer.controlsEnabled)
        else controls.enabled = activePointer.controlsEnabled
        activePointer = null
      }
      cancelWorldLayerAnimation()
      unsubscribeAudio()
      domElement.removeEventListener('pointerdown', handlePointerDown, true)
      domElement.removeEventListener('pointermove', handlePointerMove, true)
      domElement.removeEventListener('pointerup', handlePointerUp, true)
      domElement.removeEventListener('pointercancel', handlePointerCancel, true)
      domElement.removeEventListener('pointerleave', handlePointerCancel, true)
      group.removeFromParent()
      glass.geometry.dispose()
      compactMesh.geometry.dispose()
      disposeMaterial(glassMaterial)
      disposeMaterial(compactMaterial)
      listeners.clear()
    },
    animateWorldLayers,
    getProjectedBounds: project,
    getState: snapshot,
    openScreenPlayer,
    prepareCompactTexture,
    resetDebugTransform,
    setCamera(camera) { activeCamera = camera },
    setDebugPosition,
    setDebugRotationDegrees,
    setScreenPlayerState,
    subscribe(listener) {
      listeners.add(listener)
      listener(snapshot())
      return () => listeners.delete(listener)
    },
  })
}
