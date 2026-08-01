import * as THREE from 'three/webgpu'
import {
  footprintLabelOffsets,
  footprintLabelVisibility,
  formatVisitMonth,
} from '../../data/footprintsLabels'

const defaultLabelOffset = { x: 10, y: -14 }
const cameraRight = new THREE.Vector3(1, 0, 0)
const cameraUp = new THREE.Vector3(0, 1, 0)

function smoothstep(edge0, edge1, value) {
  const progress = THREE.MathUtils.clamp(
    (value - edge0) / Math.max(0.0001, edge1 - edge0),
    0,
    1,
  )
  return progress * progress * (3 - 2 * progress)
}

function isObjectWorldVisible(object) {
  let current = object
  while (current) {
    if (!current.visible) return false
    current = current.parent
  }
  return true
}

export function createFootprintsLabelLayer({
  anchors,
  locations,
  mount,
  onActivate,
}) {
  const debugEnabled =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get(
      'footprints-label-debug',
    ) === '1'
  const element = document.createElement('div')
  const controllers = new Map()
  const unlockedLabelIds = new Set()
  const worldPosition = new THREE.Vector3()
  const earthWorldCenter = new THREE.Vector3()
  const earthWorldScale = new THREE.Vector3()
  const worldNormal = new THREE.Vector3()
  const cameraWorldPosition = new THREE.Vector3()
  const cameraWorldQuaternion = new THREE.Quaternion()
  const toCamera = new THREE.Vector3()
  const projectedPosition = new THREE.Vector3()
  const projectedEarthCenter = new THREE.Vector3()
  const projectedEarthRight = new THREE.Vector3()
  const projectedEarthTop = new THREE.Vector3()
  const earthRightPoint = new THREE.Vector3()
  const earthTopPoint = new THREE.Vector3()
  const screenSafeArea = {
    centerX: 0,
    centerY: 0,
    radiusX: 1,
    radiusY: 1,
  }
  const projectionCache = {
    cameraX: Number.NaN,
    cameraY: Number.NaN,
    cameraZ: Number.NaN,
    centerX: Number.NaN,
    centerY: Number.NaN,
    centerZ: Number.NaN,
    height: 0,
    projectionX: Number.NaN,
    projectionY: Number.NaN,
    radius: Number.NaN,
    width: 0,
  }
  const viewportBounds = {
    bottom: 0,
    left: 0,
    right: 0,
    scaleX: 1,
    scaleY: 1,
    top: 0,
  }
  let viewportBoundsDirty = true
  let selectedKey = ''

  element.className = 'footprints-label-layer'
  element.dataset.debug = debugEnabled ? 'true' : 'false'
  element.dataset.hideSafeRadiusRatio = String(
    footprintLabelVisibility.hideSafeRadiusRatio,
  )
  element.dataset.showSafeRadiusRatio = String(
    footprintLabelVisibility.showSafeRadiusRatio,
  )
  element.dataset.fadeOutFacingThreshold = String(
    footprintLabelVisibility.fadeOutFacingThreshold,
  )
  element.dataset.fadeInFacingThreshold = String(
    footprintLabelVisibility.fadeInFacingThreshold,
  )
  element.dataset.showStableFrames = String(
    footprintLabelVisibility.showStableFrames,
  )

  const clearHideTimer = (controller) => {
    if (controller.hideTimer === null) return
    window.clearTimeout(controller.hideTimer)
    controller.hideTimer = null
  }

  const hide = (controller, { immediate = false } = {}) => {
    controller.stableVisibleFrames = 0
    controller.initialRevealUntil = 0
    if (!controller.isVisible && !immediate) return

    const { debugElement, labelElement } = controller
    clearHideTimer(controller)
    controller.isVisible = false
    controller.visibilityProgress = 0
    labelElement.dataset.visible = 'false'
    labelElement.dataset.interactiveVisible = 'false'
    labelElement.style.setProperty('--label-facing-opacity', '0')
    labelElement.style.setProperty('--label-fade-offset', '4px')
    labelElement.style.setProperty(
      '--label-opacity-transition',
      `${immediate ? 0 : footprintLabelVisibility.hideTransitionMs}ms`,
    )
    labelElement.setAttribute('aria-hidden', 'true')
    labelElement.setAttribute('tabindex', '-1')
    if (debugElement) debugElement.dataset.visible = 'false'

    if (immediate) {
      labelElement.style.visibility = 'hidden'
      return
    }

    controller.hideTimer = window.setTimeout(() => {
      controller.hideTimer = null
      if (!controller.isVisible) {
        labelElement.style.visibility = 'hidden'
      }
    }, footprintLabelVisibility.hideTransitionMs)
  }

  const applyVisibilityProgress = (controller, progress) => {
    const nextProgress = THREE.MathUtils.clamp(progress, 0, 1)
    const isInteractive =
      controller.isVisible &&
      nextProgress >=
        footprintLabelVisibility.interactionOpacityThreshold

    controller.visibilityProgress = nextProgress
    controller.labelElement.style.setProperty(
      '--label-facing-opacity',
      nextProgress.toFixed(3),
    )
    controller.labelElement.style.setProperty(
      '--label-fade-offset',
      `${((1 - nextProgress) * 4).toFixed(2)}px`,
    )
    controller.labelElement.dataset.interactiveVisible = isInteractive
      ? 'true'
      : 'false'
    controller.labelElement.setAttribute(
      'aria-hidden',
      isInteractive ? 'false' : 'true',
    )
    controller.labelElement.setAttribute(
      'tabindex',
      isInteractive ? '0' : '-1',
    )
  }

  const show = (controller, visibilityProgress) => {
    const { labelElement } = controller
    const isFirstAppearance = !controller.hasAppeared
    const transitionMs = isFirstAppearance
      ? footprintLabelVisibility.unlockTransitionMs
      : footprintLabelVisibility.showTransitionMs
    controller.initialRevealUntil = isFirstAppearance
      ? performance.now() + transitionMs
      : 0
    clearHideTimer(controller)
    controller.isVisible = true
    controller.stableVisibleFrames = 0
    labelElement.style.setProperty(
      '--label-opacity-transition',
      `${transitionMs}ms`,
    )
    labelElement.style.visibility = 'visible'
    labelElement.dataset.visible = 'true'
    applyVisibilityProgress(controller, visibilityProgress)
    controller.hasAppeared = true
  }

  locations.forEach((location) => {
    const key = `${location.kind}:${location.id}`
    const labelElement = document.createElement('span')
    labelElement.className = 'footprints-label'
    labelElement.dataset.entityKey = key
    labelElement.dataset.kind = location.kind
    labelElement.dataset.unlocked = 'false'
    labelElement.dataset.visible = 'false'
    labelElement.dataset.selected = 'false'
    labelElement.dataset.expanded = 'false'
    labelElement.dataset.interactiveVisible = 'false'
    labelElement.dataset.globeInteractive = 'true'
    labelElement.style.setProperty(
      '--label-opacity-transition',
      `${footprintLabelVisibility.unlockTransitionMs}ms`,
    )
    labelElement.setAttribute('aria-hidden', 'true')
    labelElement.setAttribute('role', 'button')
    labelElement.setAttribute('tabindex', '-1')
    const hasBaseTime = location.kind === 'base' && location.timeRange
    if (hasBaseTime) {
      labelElement.setAttribute('aria-expanded', 'false')
    }
    labelElement.setAttribute(
      'aria-label',
      hasBaseTime
        ? `Show time for ${location.displayName}`
        : `Select ${location.displayName}`,
    )

    const primary = document.createElement('span')
    primary.className = 'footprints-label__primary'
    primary.textContent = location.displayName
    const secondary = document.createElement('span')
    secondary.className = 'footprints-label__secondary'
    secondary.textContent = location.displayNameZh
    labelElement.append(primary, secondary)

    if (hasBaseTime) {
      const period = document.createElement('span')
      period.className = 'footprints-label__period'
      period.textContent = location.timeRange
      labelElement.append(period)
    }

    const routeGroups = location.routeGroups ?? []
    if (routeGroups.length === 1) {
      const visitLine = document.createElement('span')
      visitLine.className = 'footprints-label__visits'
      visitLine.textContent = routeGroups[0].visits
        .map(formatVisitMonth)
        .join(' · ')
      labelElement.append(visitLine)
    }

    if (routeGroups.length > 1) {
      const routeDetails = document.createElement('span')
      routeDetails.className = 'footprints-label__route-details'
      routeGroups.forEach((routeGroup) => {
        const routeDetail = document.createElement('span')
        routeDetail.className = 'footprints-label__route-detail'
        const routeSource = document.createElement('span')
        routeSource.className = 'footprints-label__route-source'
        routeSource.textContent = `From ${routeGroup.baseName}`
        const routeVisits = document.createElement('span')
        routeVisits.className = 'footprints-label__visits'
        routeVisits.textContent = routeGroup.visits
          .map(formatVisitMonth)
          .join(' · ')
        routeDetail.append(routeSource, routeVisits)
        routeDetails.append(routeDetail)
      })
      labelElement.append(routeDetails)
    }

    const activate = () => onActivate?.(location.entity)
    const handlePointerDown = (event) => event.stopPropagation()
    const handleClick = (event) => {
      event.stopPropagation()
      activate()
    }
    const handleKeyDown = (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      event.stopPropagation()
      activate()
    }
    labelElement.addEventListener('pointerdown', handlePointerDown)
    labelElement.addEventListener('click', handleClick)
    labelElement.addEventListener('keydown', handleKeyDown)
    element.appendChild(labelElement)

    let debugElement = null
    if (debugEnabled) {
      debugElement = document.createElement('span')
      debugElement.className = 'footprints-label-debug-anchor'
      debugElement.dataset.visible = 'false'
      debugElement.textContent = location.id
      element.appendChild(debugElement)
    }

    controllers.set(key, {
      anchor: anchors.get(key),
      debugElement,
      handlers: {
        handleClick,
        handleKeyDown,
        handlePointerDown,
      },
      hasAppeared: false,
      height: 1,
      hideTimer: null,
      id: location.id,
      initialRevealUntil: 0,
      isVisible: false,
      kind: location.kind,
      labelElement,
      offset: footprintLabelOffsets[location.id] ?? defaultLabelOffset,
      stableVisibleFrames: 0,
      visibilityProgress: 0,
      width: 1,
    })
  })

  mount.appendChild(element)

  const measureController = (controller) => {
    controller.width = Math.max(
      1,
      Math.ceil(controller.labelElement.offsetWidth),
    )
    controller.height = Math.max(
      1,
      Math.ceil(controller.labelElement.offsetHeight),
    )
  }

  controllers.forEach(measureController)

  const labelResizeObserver =
    typeof ResizeObserver === 'function'
      ? new ResizeObserver((entries) => {
          entries.forEach((entry) => {
            const key = entry.target.dataset.entityKey
            const controller = controllers.get(key)
            if (!controller) return
            controller.width = Math.max(
              1,
              Math.ceil(entry.contentRect.width),
            )
            controller.height = Math.max(
              1,
              Math.ceil(entry.contentRect.height),
            )
          })
        })
      : null
  controllers.forEach((controller) => {
    labelResizeObserver?.observe(controller.labelElement)
  })

  const markViewportBoundsDirty = () => {
    viewportBoundsDirty = true
  }
  window.addEventListener('resize', markViewportBoundsDirty, {
    passive: true,
  })
  window.addEventListener('scroll', markViewportBoundsDirty, {
    capture: true,
    passive: true,
  })
  const transformedAncestors = [
    mount.closest('.footprints-globe-entrance'),
    mount.closest('.footprints-globe-exit'),
  ].filter(Boolean)
  const transformObserver =
    typeof MutationObserver === 'function'
      ? new MutationObserver(markViewportBoundsDirty)
      : null
  transformedAncestors.forEach((ancestor) => {
    transformObserver?.observe(ancestor, {
      attributes: true,
      attributeFilter: ['style'],
    })
  })

  const updateViewportBounds = (width, height) => {
    if (!viewportBoundsDirty) return
    const bounds = mount.getBoundingClientRect()
    viewportBounds.left = bounds.left
    viewportBounds.right = bounds.right
    viewportBounds.top = bounds.top
    viewportBounds.bottom = bounds.bottom
    viewportBounds.scaleX = bounds.width / Math.max(1, width)
    viewportBounds.scaleY = bounds.height / Math.max(1, height)
    viewportBoundsDirty = false
  }

  const updateScreenSafeArea = ({ camera, earthObject, height, width }) => {
    earthObject.getWorldPosition(earthWorldCenter)
    earthObject.getWorldScale(earthWorldScale)
    camera.getWorldPosition(cameraWorldPosition)
    const earthRadius = Math.max(
      Math.abs(earthWorldScale.x),
      Math.abs(earthWorldScale.y),
      Math.abs(earthWorldScale.z),
    )
    const projectionX = camera.projectionMatrix.elements[0]
    const projectionY = camera.projectionMatrix.elements[5]
    const projectionChanged =
      projectionCache.width !== width ||
      projectionCache.height !== height ||
      projectionCache.centerX !== earthWorldCenter.x ||
      projectionCache.centerY !== earthWorldCenter.y ||
      projectionCache.centerZ !== earthWorldCenter.z ||
      projectionCache.radius !== earthRadius ||
      projectionCache.cameraX !== cameraWorldPosition.x ||
      projectionCache.cameraY !== cameraWorldPosition.y ||
      projectionCache.cameraZ !== cameraWorldPosition.z ||
      projectionCache.projectionX !== projectionX ||
      projectionCache.projectionY !== projectionY

    if (!projectionChanged) return

    camera.getWorldQuaternion(cameraWorldQuaternion)
    projectedEarthCenter.copy(earthWorldCenter).project(camera)
    earthRightPoint
      .copy(cameraRight)
      .applyQuaternion(cameraWorldQuaternion)
      .multiplyScalar(earthRadius)
      .add(earthWorldCenter)
    earthTopPoint
      .copy(cameraUp)
      .applyQuaternion(cameraWorldQuaternion)
      .multiplyScalar(earthRadius)
      .add(earthWorldCenter)
    projectedEarthRight.copy(earthRightPoint).project(camera)
    projectedEarthTop.copy(earthTopPoint).project(camera)

    screenSafeArea.centerX =
      (projectedEarthCenter.x * 0.5 + 0.5) * width
    screenSafeArea.centerY =
      (-projectedEarthCenter.y * 0.5 + 0.5) * height
    screenSafeArea.radiusX = Math.max(
      1,
      Math.abs(projectedEarthRight.x - projectedEarthCenter.x) *
        width *
        0.5,
    )
    screenSafeArea.radiusY = Math.max(
      1,
      Math.abs(projectedEarthTop.y - projectedEarthCenter.y) *
        height *
        0.5,
    )

    if (debugEnabled) {
      element.dataset.screenCenterX = screenSafeArea.centerX.toFixed(1)
      element.dataset.screenCenterY = screenSafeArea.centerY.toFixed(1)
      element.dataset.screenRadiusX = screenSafeArea.radiusX.toFixed(1)
      element.dataset.screenRadiusY = screenSafeArea.radiusY.toFixed(1)
    }

    projectionCache.width = width
    projectionCache.height = height
    projectionCache.centerX = earthWorldCenter.x
    projectionCache.centerY = earthWorldCenter.y
    projectionCache.centerZ = earthWorldCenter.z
    projectionCache.radius = earthRadius
    projectionCache.cameraX = cameraWorldPosition.x
    projectionCache.cameraY = cameraWorldPosition.y
    projectionCache.cameraZ = cameraWorldPosition.z
    projectionCache.projectionX = projectionX
    projectionCache.projectionY = projectionY
  }

  const isCornerInsideEllipse = (x, y, radiusRatio) => {
    const normalizedX =
      (x - screenSafeArea.centerX) /
      (screenSafeArea.radiusX * radiusRatio)
    const normalizedY =
      (y - screenSafeArea.centerY) /
      (screenSafeArea.radiusY * radiusRatio)
    return normalizedX * normalizedX + normalizedY * normalizedY <= 1
  }

  const isWholeLabelSafe = (
    controller,
    x,
    y,
    radiusRatio,
    width,
    height,
  ) => {
    const padding = footprintLabelVisibility.boundsPaddingPx
    const left = x - controller.width / 2 - padding
    const right = x + controller.width / 2 + padding
    const top = y - padding
    const bottom = y + controller.height + padding
    const margin = footprintLabelVisibility.viewportMarginPx
    const isInsideContainer =
      left >= margin &&
      right <= width - margin &&
      top >= margin &&
      bottom <= height - margin
    if (!isInsideContainer) return false

    const viewportLeft =
      viewportBounds.left + left * viewportBounds.scaleX
    const viewportRight =
      viewportBounds.left + right * viewportBounds.scaleX
    const viewportTop =
      viewportBounds.top + top * viewportBounds.scaleY
    const viewportBottom =
      viewportBounds.top + bottom * viewportBounds.scaleY
    const isInsideViewport =
      viewportLeft >= margin &&
      viewportRight <= window.innerWidth - margin &&
      viewportTop >= margin &&
      viewportBottom <= window.innerHeight - margin
    if (!isInsideViewport) return false

    return (
      isCornerInsideEllipse(left, top, radiusRatio) &&
      isCornerInsideEllipse(right, top, radiusRatio) &&
      isCornerInsideEllipse(left, bottom, radiusRatio) &&
      isCornerInsideEllipse(right, bottom, radiusRatio)
    )
  }

  const reset = () => {
    unlockedLabelIds.clear()
    controllers.forEach((controller) => {
      controller.hasAppeared = false
      controller.initialRevealUntil = 0
      controller.labelElement.dataset.unlocked = 'false'
      hide(controller, { immediate: true })
    })
  }

  const unlock = ({ id, kind }) => {
    const key = `${kind}:${id}`
    if (unlockedLabelIds.has(key)) return false
    const controller = controllers.get(key)
    if (!controller) return false
    unlockedLabelIds.add(key)
    controller.labelElement.dataset.unlocked = 'true'
    return true
  }

  const setSelectedEntity = (entity) => {
    selectedKey = entity ? `${entity.kind}:${entity.id}` : ''
    controllers.forEach((controller, key) => {
      const selected = key === selectedKey
      controller.labelElement.dataset.selected = selected
        ? 'true'
        : 'false'
      controller.labelElement.dataset.expanded = selected
        ? 'true'
        : 'false'
      if (controller.kind === 'base') {
        controller.labelElement.setAttribute(
          'aria-expanded',
          selected ? 'true' : 'false',
        )
        controller.labelElement.setAttribute(
          'aria-label',
          `${selected ? 'Hide' : 'Show'} time for ${controller.labelElement.querySelector('.footprints-label__primary')?.textContent ?? controller.id}`,
        )
      }
      measureController(controller)
    })
  }

  const update = ({ camera, earthObject, height, width }) => {
    updateViewportBounds(width, height)
    updateScreenSafeArea({ camera, earthObject, height, width })

    controllers.forEach((controller, key) => {
      if (!unlockedLabelIds.has(key) || !controller.anchor) {
        hide(controller)
        return
      }
      if (!isObjectWorldVisible(controller.anchor)) {
        hide(controller)
        return
      }

      controller.anchor.getWorldPosition(worldPosition)
      worldNormal
        .copy(worldPosition)
        .sub(earthWorldCenter)
        .normalize()
      toCamera
        .copy(cameraWorldPosition)
        .sub(worldPosition)
        .normalize()
      const facing = worldNormal.dot(toCamera)
      const facingProgress = smoothstep(
        footprintLabelVisibility.fadeOutFacingThreshold,
        footprintLabelVisibility.fadeInFacingThreshold,
        facing,
      )

      projectedPosition.copy(worldPosition).project(camera)
      if (
        projectedPosition.z <= -1 ||
        projectedPosition.z >= 1
      ) {
        hide(controller)
        return
      }

      const anchorX = (projectedPosition.x * 0.5 + 0.5) * width
      const anchorY = (-projectedPosition.y * 0.5 + 0.5) * height
      const x = anchorX + controller.offset.x
      const y = anchorY + controller.offset.y
      const { debugElement, labelElement } = controller
      const hideBoundsSafe =
        controller.isVisible ||
        !controller.hasAppeared ||
        debugEnabled
          ? isWholeLabelSafe(
              controller,
              x,
              y,
              footprintLabelVisibility.hideSafeRadiusRatio,
              width,
              height,
            )
          : false
      const showBoundsSafe =
        !controller.isVisible || debugEnabled
          ? isWholeLabelSafe(
              controller,
              x,
              y,
              footprintLabelVisibility.showSafeRadiusRatio,
              width,
              height,
            )
          : false

      labelElement.style.transform =
        `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) ` +
        'translate(-50%, 0) translateY(var(--label-fade-offset, 4px))'

      if (debugEnabled) {
        labelElement.dataset.facing = facing.toFixed(3)
        labelElement.dataset.visibilityProgress =
          facingProgress.toFixed(3)
        labelElement.dataset.screenX = x.toFixed(1)
        labelElement.dataset.screenY = y.toFixed(1)
        labelElement.dataset.cachedWidth = String(controller.width)
        labelElement.dataset.cachedHeight = String(controller.height)
        labelElement.dataset.hideBoundsSafe = hideBoundsSafe
          ? 'true'
          : 'false'
        labelElement.dataset.showBoundsSafe = showBoundsSafe
          ? 'true'
          : 'false'
        labelElement.dataset.stableVisibleFrames = String(
          controller.stableVisibleFrames,
        )
      }

      if (controller.isVisible) {
        const isCompletingInitialReveal =
          performance.now() < controller.initialRevealUntil
        const remainsSafe =
          facingProgress > 0 &&
          (hideBoundsSafe || isCompletingInitialReveal)
        if (!remainsSafe) {
          hide(controller)
          return
        }
        applyVisibilityProgress(controller, facingProgress)
      } else {
        // A route arrival is the label's first presentation, not a
        // re-entry from the globe edge. The current hide boundary is
        // already the safe full-label boundary; reserve the smaller
        // show boundary and stable-frame delay for later re-entry.
        const initialBoundsSafe =
          !controller.hasAppeared && hideBoundsSafe
        const reentryBoundsSafe =
          controller.hasAppeared && showBoundsSafe
        const canShow =
          facingProgress > 0 &&
          (initialBoundsSafe || reentryBoundsSafe)
        controller.stableVisibleFrames = canShow
          ? controller.stableVisibleFrames + 1
          : 0
        const requiredFrames = controller.hasAppeared
          ? footprintLabelVisibility.showStableFrames
          : 1
        if (controller.stableVisibleFrames < requiredFrames) {
          return
        }
        show(controller, facingProgress)
      }

      if (debugElement) {
        debugElement.style.transform =
          `translate3d(${anchorX.toFixed(1)}px, ` +
          `${anchorY.toFixed(1)}px, 0)`
        debugElement.textContent =
          `${controller.id} · ${facing.toFixed(3)}`
        debugElement.dataset.visible = 'true'
      }
    })
  }

  const dispose = () => {
    labelResizeObserver?.disconnect()
    transformObserver?.disconnect()
    window.removeEventListener('resize', markViewportBoundsDirty)
    window.removeEventListener('scroll', markViewportBoundsDirty, true)
    controllers.forEach((controller) => {
      clearHideTimer(controller)
      const { handlers, labelElement } = controller
      labelElement.removeEventListener(
        'pointerdown',
        handlers.handlePointerDown,
      )
      labelElement.removeEventListener('click', handlers.handleClick)
      labelElement.removeEventListener(
        'keydown',
        handlers.handleKeyDown,
      )
    })
    element.remove()
  }

  return {
    dispose,
    reset,
    setSelectedEntity,
    unlock,
    update,
  }
}
