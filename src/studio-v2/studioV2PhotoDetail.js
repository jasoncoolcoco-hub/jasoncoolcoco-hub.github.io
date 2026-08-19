import * as THREE from 'three'

export const STUDIO_V2_PHOTO_DETAIL_STATES = Object.freeze({
  IDLE: 'IDLE',
  LOADING: 'PHOTO_DETAIL_LOADING',
  OPENING: 'PHOTO_DETAIL_OPENING',
  OPEN: 'PHOTO_DETAIL',
  CLOSING: 'PHOTO_DETAIL_CLOSING',
})

export const STUDIO_V2_PHOTO_DETAIL_CONFIG = Object.freeze({
  clickTolerancePx: 5,
  detailDistance: 1.15,
  durationMs: 280,
  landscapeWidthRatio: 0.60,
  maxHeightRatio: 0.68,
  maxWidthRatio: 0.62,
  portraitHeightRatio: 0.65,
  renderOrder: 1000,
})

export function studioV2PhotoDetailEase(progress) {
  const value = THREE.MathUtils.clamp(progress, 0, 1)
  return value < 0.5
    ? 4 * value ** 3
    : 1 - (-2 * value + 2) ** 3 / 2
}

export function calculateStudioV2PhotoDetailFit({ camera, dimensions }) {
  const aspect = camera.aspect
  const distance = STUDIO_V2_PHOTO_DETAIL_CONFIG.detailDistance
  const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance
  const visibleWidth = visibleHeight * aspect
  const landscape = dimensions.width >= dimensions.height
  const primaryScale = landscape
    ? visibleWidth * STUDIO_V2_PHOTO_DETAIL_CONFIG.landscapeWidthRatio / dimensions.width
    : visibleHeight * STUDIO_V2_PHOTO_DETAIL_CONFIG.portraitHeightRatio / dimensions.height
  const fitScale = Math.min(
    primaryScale,
    visibleWidth * STUDIO_V2_PHOTO_DETAIL_CONFIG.maxWidthRatio / dimensions.width,
    visibleHeight * STUDIO_V2_PHOTO_DETAIL_CONFIG.maxHeightRatio / dimensions.height,
  )
  return Object.freeze({
    distance,
    heightRatio: dimensions.height * fitScale / visibleHeight,
    landscape,
    scale: fitScale,
    widthRatio: dimensions.width * fitScale / visibleWidth,
  })
}

function photoGroupFromObject(object, photoBoardRoot) {
  let current = object
  while (current && current !== photoBoardRoot) {
    if (current.userData?.photoPackaging) return current
    current = current.parent
  }
  return null
}

function cloneTransform(object) {
  return {
    position: object.position.clone(),
    quaternion: object.quaternion.clone(),
    scale: object.scale.clone(),
  }
}

function applyTransform(object, transform) {
  object.position.copy(transform.position)
  object.quaternion.copy(transform.quaternion)
  object.scale.copy(transform.scale)
  object.updateMatrix()
}

export function createStudioV2PhotoDetail({
  activateDetailQuality = () => true,
  camera,
  cameraDirector,
  domElement,
  now = () => performance.now(),
  photoBoardRoot,
  photoHover,
  prepareDetailQuality = null,
  restoreDetailQuality = () => true,
}) {
  if (!photoBoardRoot) throw new Error('PHOTO_BOARD_01 detail root was not found.')
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const cardStates = new Map()
  const cameraDirection = new THREE.Vector3()
  const cameraPosition = new THREE.Vector3()
  const cameraQuaternion = new THREE.Quaternion()
  const targetWorldMatrix = new THREE.Matrix4()
  const targetLocalMatrix = new THREE.Matrix4()
  const targetWorldPosition = new THREE.Vector3()
  const targetWorldScale = new THREE.Vector3()
  let interactionState = STUDIO_V2_PHOTO_DETAIL_STATES.IDLE
  let selected = null
  let transition = null
  let pointerIntent = null
  let lastExit = 'NONE'
  let disposed = false
  let pendingDetail = null
  let detailLoadToken = 0

  photoBoardRoot.traverse((object) => {
    if (!object.userData?.photoPackaging) return
    const rigidCard = object.getObjectByName('PHOTO_RIGID_CARD')
    if (!rigidCard) throw new Error(`${object.name}: PHOTO_RIGID_CARD detail target was not found.`)
    const contactShadow = object.getObjectByName('PHOTO_CONTACT_SHADOW')
    const renderOrders = new Map()
    rigidCard.traverse((child) => renderOrders.set(child, child.renderOrder))
    cardStates.set(object, {
      base: cloneTransform(rigidCard),
      baseContactShadowVisible: contactShadow?.visible ?? null,
      contactShadow,
      renderOrders,
      rigidCard,
    })
  })

  function isOpen() {
    return interactionState !== STUDIO_V2_PHOTO_DETAIL_STATES.IDLE
  }

  function pointerFromEvent(event) {
    const rect = domElement.getBoundingClientRect()
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.setFromCamera(pointer, camera)
  }

  function hitPhoto(event) {
    pointerFromEvent(event)
    const intersections = raycaster.intersectObject(photoBoardRoot, true)
    for (const intersection of intersections) {
      const card = photoGroupFromObject(intersection.object, photoBoardRoot)
      if (cardStates.has(card)) return card
    }
    return null
  }

  function hitSelected(event) {
    if (!selected) return false
    pointerFromEvent(event)
    return raycaster.intersectObject(selected.state.rigidCard, true).length > 0
  }

  function calculateTarget(card, cardState) {
    camera.updateWorldMatrix(true, false)
    card.updateWorldMatrix(true, false)
    camera.getWorldDirection(cameraDirection)
    camera.getWorldPosition(cameraPosition)
    camera.getWorldQuaternion(cameraQuaternion)
    targetWorldPosition.copy(cameraPosition).addScaledVector(
      cameraDirection,
      STUDIO_V2_PHOTO_DETAIL_CONFIG.detailDistance,
    )
    const fit = calculateStudioV2PhotoDetailFit({
      camera,
      dimensions: card.userData.photoPackaging.dimensions,
    })
    targetWorldScale.setScalar(fit.scale)
    targetWorldMatrix.compose(targetWorldPosition, cameraQuaternion, targetWorldScale)
    targetLocalMatrix.copy(card.matrixWorld).invert().multiply(targetWorldMatrix)
    const target = {
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      scale: new THREE.Vector3(),
    }
    targetLocalMatrix.decompose(target.position, target.quaternion, target.scale)
    return { fit, transform: target }
  }

  function restoreRenderOrder(cardState) {
    cardState.renderOrders.forEach((renderOrder, object) => {
      object.renderOrder = renderOrder
    })
  }

  function restoreContactShadow(cardState) {
    if (cardState.contactShadow && cardState.baseContactShadowVisible !== null) {
      cardState.contactShadow.visible = cardState.baseContactShadowVisible
    }
  }

  function restoreImmediately() {
    detailLoadToken += 1
    pendingDetail = null
    if (selected) {
      applyTransform(selected.state.rigidCard, selected.state.base)
      restoreRenderOrder(selected.state)
      restoreContactShadow(selected.state)
      restoreDetailQuality(selected.card.userData?.studioV2Id)
    }
    selected = null
    transition = null
    interactionState = STUDIO_V2_PHOTO_DETAIL_STATES.IDLE
    pointerIntent = null
    photoHover?.setInteractionLocked(false)
    domElement.style.cursor = ''
  }

  function beginDetail(card, cardState, source) {
    if (!cardState || cameraDirector.getCurrentState() !== 'PHOTO_WALL_FOCUS') return false
    const openingSource = cloneTransform(cardState.rigidCard)
    photoHover?.setInteractionLocked(true)
    applyTransform(cardState.rigidCard, openingSource)
    if (cardState.contactShadow) cardState.contactShadow.visible = false
    cardState.rigidCard.traverse((object) => {
      object.renderOrder = STUDIO_V2_PHOTO_DETAIL_CONFIG.renderOrder
    })
    const target = calculateTarget(card, cardState)
    selected = { card, fit: target.fit, source, state: cardState, target: target.transform }
    transition = {
      from: openingSource,
      startedAt: now(),
      to: target.transform,
    }
    interactionState = STUDIO_V2_PHOTO_DETAIL_STATES.OPENING
    lastExit = 'NONE'
    domElement.style.cursor = 'pointer'
    return true
  }

  function requestDetail(card, source = 'API') {
    if (disposed || isOpen() || cameraDirector.getCurrentState() !== 'PHOTO_WALL_FOCUS') return false
    const cardState = cardStates.get(card)
    if (!cardState) return false
    const id = card.userData?.studioV2Id
    if (activateDetailQuality(id) || typeof prepareDetailQuality !== 'function') {
      return beginDetail(card, cardState, source)
    }
    const token = ++detailLoadToken
    pendingDetail = { card, cardState, id, source, token }
    interactionState = STUDIO_V2_PHOTO_DETAIL_STATES.LOADING
    lastExit = 'NONE'
    photoHover?.setInteractionLocked(true)
    domElement.style.cursor = 'progress'
    Promise.resolve(prepareDetailQuality(id)).then((ready) => {
      if (disposed || !pendingDetail || pendingDetail.token !== token) return
      const pending = pendingDetail
      pendingDetail = null
      if (
        !ready
        || cameraDirector.getCurrentState() !== 'PHOTO_WALL_FOCUS'
        || !activateDetailQuality(id)
      ) {
        interactionState = STUDIO_V2_PHOTO_DETAIL_STATES.IDLE
        lastExit = 'DETAIL_QUALITY_FAILED'
        photoHover?.setInteractionLocked(false)
        domElement.style.cursor = ''
        return
      }
      beginDetail(pending.card, pending.cardState, pending.source)
    }).catch(() => {
      if (disposed || !pendingDetail || pendingDetail.token !== token) return
      pendingDetail = null
      interactionState = STUDIO_V2_PHOTO_DETAIL_STATES.IDLE
      lastExit = 'DETAIL_QUALITY_FAILED'
      photoHover?.setInteractionLocked(false)
      domElement.style.cursor = ''
    })
    return true
  }

  function closeDetail(source = 'API') {
    if (interactionState === STUDIO_V2_PHOTO_DETAIL_STATES.LOADING) {
      detailLoadToken += 1
      pendingDetail = null
      interactionState = STUDIO_V2_PHOTO_DETAIL_STATES.IDLE
      lastExit = source
      photoHover?.setInteractionLocked(false)
      domElement.style.cursor = ''
      return true
    }
    if (!selected || interactionState === STUDIO_V2_PHOTO_DETAIL_STATES.CLOSING) return false
    transition = {
      from: cloneTransform(selected.state.rigidCard),
      startedAt: now(),
      to: selected.state.base,
    }
    interactionState = STUDIO_V2_PHOTO_DETAIL_STATES.CLOSING
    lastExit = source
    domElement.style.cursor = ''
    return true
  }

  function onPointerDown(event) {
    if (event.button !== 0 && event.pointerType !== 'touch') return
    if (cameraDirector.getCurrentState() !== 'PHOTO_WALL_FOCUS') return
    const hitCard = isOpen() ? null : hitPhoto(event)
    pointerIntent = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      card: hitCard,
      selected: isOpen() && hitSelected(event),
    }
    if (isOpen()) event.stopImmediatePropagation?.()
  }

  function onWindowPointerDown(event) {
    if (!isOpen() || !event.target || domElement.contains?.(event.target)) return
    closeDetail('OUTSIDE_CLICK')
    event.stopImmediatePropagation?.()
  }

  function onPointerMove(event) {
    if (!pointerIntent || pointerIntent.id !== event.pointerId) return
    if (Math.hypot(event.clientX - pointerIntent.x, event.clientY - pointerIntent.y)
      > STUDIO_V2_PHOTO_DETAIL_CONFIG.clickTolerancePx) {
      pointerIntent.moved = true
    }
    if (isOpen()) event.stopImmediatePropagation?.()
  }

  function onPointerUp(event) {
    if (!pointerIntent || pointerIntent.id !== event.pointerId) return
    const intent = pointerIntent
    pointerIntent = null
    if (intent.moved) return
    if (isOpen()) {
      closeDetail(intent.selected && hitSelected(event) ? 'SELECTED_CLICK' : 'OUTSIDE_CLICK')
      event.stopImmediatePropagation?.()
      return
    }
    const releasedCard = hitPhoto(event)
    if (intent.card && releasedCard === intent.card) requestDetail(intent.card, 'CLICK')
  }

  function onKeyDown(event) {
    if (event.key !== 'Escape' || !isOpen()) return
    closeDetail('ESCAPE')
    event.stopImmediatePropagation?.()
  }

  domElement.addEventListener('pointerdown', onPointerDown, true)
  domElement.addEventListener('pointermove', onPointerMove, true)
  window.addEventListener('pointerdown', onWindowPointerDown, true)
  window.addEventListener('pointerup', onPointerUp, true)
  window.addEventListener('pointercancel', onPointerUp, true)
  window.addEventListener('keydown', onKeyDown, true)

  return Object.freeze({
    closeDetail,
    dispose() {
      if (disposed) return
      disposed = true
      restoreImmediately()
      domElement.removeEventListener('pointerdown', onPointerDown, true)
      domElement.removeEventListener('pointermove', onPointerMove, true)
      window.removeEventListener('pointerdown', onWindowPointerDown, true)
      window.removeEventListener('pointerup', onPointerUp, true)
      window.removeEventListener('pointercancel', onPointerUp, true)
      window.removeEventListener('keydown', onKeyDown, true)
      cardStates.clear()
    },
    getState() {
      return {
        config: STUDIO_V2_PHOTO_DETAIL_CONFIG,
        fit: selected?.fit ?? null,
        interactionState,
        lastExit,
        selectedId: selected?.card.userData?.studioV2Id ?? pendingDetail?.id ?? null,
      }
    },
    isOpen,
    refresh() {
      if (!selected) return false
      const next = calculateTarget(selected.card, selected.state)
      selected.fit = next.fit
      selected.target = next.transform
      if (interactionState === STUDIO_V2_PHOTO_DETAIL_STATES.OPEN) {
        applyTransform(selected.state.rigidCard, selected.target)
      } else if (interactionState === STUDIO_V2_PHOTO_DETAIL_STATES.OPENING) {
        transition.to = selected.target
      }
      return true
    },
    requestDetail,
    requestDetailById(id, source = 'API') {
      const card = [...cardStates.keys()].find((candidate) => candidate.userData?.studioV2Id === id)
      return card ? requestDetail(card, source) : false
    },
    update(time) {
      if (disposed) return false
      if (isOpen() && cameraDirector.getCurrentState() !== 'PHOTO_WALL_FOCUS') {
        lastExit = 'FOCUS_LIFECYCLE_RESET'
        restoreImmediately()
        return false
      }
      if (!transition || !selected) return false
      const progress = THREE.MathUtils.clamp(
        (time - transition.startedAt) / STUDIO_V2_PHOTO_DETAIL_CONFIG.durationMs,
        0,
        1,
      )
      const eased = studioV2PhotoDetailEase(progress)
      selected.state.rigidCard.position.lerpVectors(
        transition.from.position,
        transition.to.position,
        eased,
      )
      selected.state.rigidCard.quaternion.slerpQuaternions(
        transition.from.quaternion,
        transition.to.quaternion,
        eased,
      )
      selected.state.rigidCard.scale.lerpVectors(
        transition.from.scale,
        transition.to.scale,
        eased,
      )
      selected.state.rigidCard.updateMatrix()
      if (progress < 1) return true
      applyTransform(selected.state.rigidCard, transition.to)
      transition = null
      if (interactionState === STUDIO_V2_PHOTO_DETAIL_STATES.OPENING) {
        interactionState = STUDIO_V2_PHOTO_DETAIL_STATES.OPEN
        return false
      }
      restoreRenderOrder(selected.state)
      restoreContactShadow(selected.state)
      restoreDetailQuality(selected.card.userData?.studioV2Id)
      selected = null
      interactionState = STUDIO_V2_PHOTO_DETAIL_STATES.IDLE
      photoHover?.setInteractionLocked(false)
      return false
    },
  })
}
