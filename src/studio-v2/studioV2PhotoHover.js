import * as THREE from 'three'

export const STUDIO_V2_PHOTO_HOVER_CONFIG = Object.freeze({
  boardCenter: Object.freeze({ x: 50, y: 50 }),
  centerDampingFull: 0.75,
  centerDampingStart: 0.08,
  durationMs: 150,
  liftLocal: 0.007,
  maxTiltXDegrees: 2,
  maxTiltYDegrees: 2.6,
  scale: 1.012,
  shadowOpacityIncrease: 0.18,
  shadowTightness: 0.97,
})

export function studioV2PhotoHoverEnabled(cameraState) {
  return cameraState === 'PHOTO_WALL_FOCUS'
}

export function studioV2PhotoHoverEase(progress) {
  const value = THREE.MathUtils.clamp(progress, 0, 1)
  return 1 - (1 - value) ** 3
}

export function studioV2PhotoTiltFromBoardPosition(boardCoordinates) {
  const center = STUDIO_V2_PHOTO_HOVER_CONFIG.boardCenter
  const offsetX = THREE.MathUtils.clamp((center.x - boardCoordinates.x) / 50, -1, 1)
  const offsetY = THREE.MathUtils.clamp((center.y - boardCoordinates.y) / 50, -1, 1)
  const radialDistance = THREE.MathUtils.clamp(
    Math.hypot(offsetX, offsetY) / Math.SQRT2,
    0,
    1,
  )
  const damping = THREE.MathUtils.smoothstep(
    radialDistance,
    STUDIO_V2_PHOTO_HOVER_CONFIG.centerDampingStart,
    STUDIO_V2_PHOTO_HOVER_CONFIG.centerDampingFull,
  )
  const xDegrees = offsetY * STUDIO_V2_PHOTO_HOVER_CONFIG.maxTiltXDegrees * damping
  const yDegrees = offsetX * STUDIO_V2_PHOTO_HOVER_CONFIG.maxTiltYDegrees * damping
  return Object.freeze({
    damping,
    radialDistance,
    xDegrees,
    xRadians: THREE.MathUtils.degToRad(xDegrees),
    yDegrees,
    yRadians: THREE.MathUtils.degToRad(yDegrees),
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

export function createStudioV2PhotoHover({
  camera,
  cameraDirector,
  domElement,
  photoBoardRoot,
}) {
  if (!photoBoardRoot) throw new Error('PHOTO_BOARD_01 hover root was not found.')
  const pointer = new THREE.Vector2()
  const raycaster = new THREE.Raycaster()
  const tiltEuler = new THREE.Euler(0, 0, 0, 'XYZ')
  const tiltQuaternion = new THREE.Quaternion()
  const inverseRootQuaternion = new THREE.Quaternion()
  const cardStates = new Map()
  let hoveredCard = null
  let interactionLocked = false
  let lastUpdateTime = null
  let disposed = false

  photoBoardRoot.traverse((object) => {
    if (!object.userData?.photoPackaging) return
    const shadow = object.getObjectByName('PHOTO_CONTACT_SHADOW')
    const rigidCard = object.getObjectByName('PHOTO_RIGID_CARD')
    if (!rigidCard) throw new Error(`${object.name}: PHOTO_RIGID_CARD hover target was not found.`)
    cardStates.set(object, {
      baseRigidPositionZ: rigidCard.position.z,
      baseRigidQuaternion: rigidCard.quaternion.clone(),
      baseRigidScale: rigidCard.scale.clone(),
      rootScaleZ: object.scale.z,
      baseShadowMaterial: shadow?.material ?? null,
      baseShadowScale: shadow?.scale.clone() ?? null,
      hoverShadowMaterial: null,
      progress: 0,
      rigidCard,
      shadow,
      target: 0,
      tilt: studioV2PhotoTiltFromBoardPosition(object.userData.photoPackaging.boardCoordinates),
    })
  })

  function enabled() {
    return !interactionLocked && studioV2PhotoHoverEnabled(cameraDirector.getCurrentState())
  }

  function ensureHoverShadow(cardState) {
    if (!cardState.shadow || cardState.hoverShadowMaterial) return
    cardState.hoverShadowMaterial = cardState.baseShadowMaterial.clone()
    cardState.shadow.material = cardState.hoverShadowMaterial
  }

  function releaseHoverShadow(cardState) {
    if (!cardState.hoverShadowMaterial) return
    cardState.shadow.material = cardState.baseShadowMaterial
    cardState.hoverShadowMaterial.dispose()
    cardState.hoverShadowMaterial = null
  }

  function resetCard(card, cardState) {
    cardState.rigidCard.position.z = cardState.baseRigidPositionZ
    cardState.rigidCard.quaternion.copy(cardState.baseRigidQuaternion)
    cardState.rigidCard.scale.copy(cardState.baseRigidScale)
    if (cardState.shadow) {
      cardState.shadow.scale.copy(cardState.baseShadowScale)
    }
    cardState.progress = 0
    cardState.target = 0
    releaseHoverShadow(cardState)
  }

  function clearHover({ immediate = false } = {}) {
    hoveredCard = null
    domElement.style.cursor = ''
    cardStates.forEach((cardState, card) => {
      cardState.target = 0
      if (immediate) resetCard(card, cardState)
    })
  }

  function setHoveredCard(nextCard) {
    if (nextCard === hoveredCard) return
    if (hoveredCard) cardStates.get(hoveredCard).target = 0
    hoveredCard = nextCard
    if (hoveredCard) cardStates.get(hoveredCard).target = 1
    domElement.style.cursor = hoveredCard ? 'pointer' : ''
  }

  function hitPhoto(event) {
    const rect = domElement.getBoundingClientRect()
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    raycaster.setFromCamera(pointer, camera)
    const intersections = raycaster.intersectObject(photoBoardRoot, true)
    for (const intersection of intersections) {
      const card = photoGroupFromObject(intersection.object, photoBoardRoot)
      if (cardStates.has(card)) return card
    }
    return null
  }

  function onPointerMove(event) {
    if (!enabled()) {
      if (!interactionLocked) clearHover({ immediate: true })
      return
    }
    setHoveredCard(hitPhoto(event))
  }

  function onPointerLeave() {
    clearHover()
  }

  domElement.addEventListener('pointermove', onPointerMove, true)
  domElement.addEventListener('pointerleave', onPointerLeave, true)

  return Object.freeze({
    dispose() {
      if (disposed) return
      disposed = true
      domElement.removeEventListener('pointermove', onPointerMove, true)
      domElement.removeEventListener('pointerleave', onPointerLeave, true)
      clearHover({ immediate: true })
      cardStates.clear()
    },
    getState() {
      return {
        config: STUDIO_V2_PHOTO_HOVER_CONFIG,
        enabled: enabled(),
        hoveredId: hoveredCard?.userData?.studioV2Id ?? null,
        interactionLocked,
        liftedCount: [...cardStates.values()].filter(({ progress }) => progress > 0).length,
      }
    },
    setInteractionLocked(locked) {
      interactionLocked = Boolean(locked)
      if (interactionLocked) clearHover({ immediate: true })
      return interactionLocked
    },
    update(time) {
      if (disposed) return false
      if (interactionLocked) {
        lastUpdateTime = time
        return false
      }
      if (!enabled()) {
        clearHover({ immediate: true })
        lastUpdateTime = time
        return false
      }
      const deltaMs = lastUpdateTime == null
        ? 16
        : THREE.MathUtils.clamp(time - lastUpdateTime, 0, 50)
      lastUpdateTime = time
      let active = false
      cardStates.forEach((cardState, card) => {
        if (cardState.progress === cardState.target) return
        const direction = Math.sign(cardState.target - cardState.progress)
        cardState.progress = THREE.MathUtils.clamp(
          cardState.progress + direction * deltaMs / STUDIO_V2_PHOTO_HOVER_CONFIG.durationMs,
          0,
          1,
        )
        const eased = studioV2PhotoHoverEase(cardState.progress)
        cardState.rigidCard.position.z = cardState.baseRigidPositionZ
          + STUDIO_V2_PHOTO_HOVER_CONFIG.liftLocal / cardState.rootScaleZ * eased
        tiltEuler.set(
          cardState.tilt.xRadians * eased,
          cardState.tilt.yRadians * eased,
          0,
        )
        tiltQuaternion.setFromEuler(tiltEuler)
        inverseRootQuaternion.copy(card.quaternion).invert()
        cardState.rigidCard.quaternion.copy(inverseRootQuaternion)
          .multiply(tiltQuaternion)
          .multiply(card.quaternion)
          .multiply(cardState.baseRigidQuaternion)
        const scale = THREE.MathUtils.lerp(1, STUDIO_V2_PHOTO_HOVER_CONFIG.scale, eased)
        cardState.rigidCard.scale.copy(cardState.baseRigidScale).multiplyScalar(scale)
        if (cardState.progress > 0) {
          ensureHoverShadow(cardState)
          cardState.shadow.scale.copy(cardState.baseShadowScale).multiplyScalar(
            THREE.MathUtils.lerp(1, STUDIO_V2_PHOTO_HOVER_CONFIG.shadowTightness, eased),
          )
          cardState.hoverShadowMaterial.opacity = Math.min(
            1,
            cardState.baseShadowMaterial.opacity
              + STUDIO_V2_PHOTO_HOVER_CONFIG.shadowOpacityIncrease * eased,
          )
        } else {
          releaseHoverShadow(cardState)
        }
        active = true
      })
      return active
    },
  })
}
