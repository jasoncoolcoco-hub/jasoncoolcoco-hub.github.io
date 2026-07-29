import * as THREE from 'three/webgpu'
import {
  baseNodeStyles,
  earthRadius,
  primaryLifeRoutes,
  routeAnimationTiming,
  routeEnergyStyles,
  routeLayerGeometry,
  routeLayerPalette,
} from '../../data/routes'
import { secondaryRouteAnimation } from '../../data/secondaryRoutes'
import {
  footprintBaseLocations,
  footprintBaseLocationsById,
} from '../../data/locations'
import { createRouteCurve } from './createRouteCurve'
import { createSecondaryRouteLayer } from './createSecondaryRouteLayer'
import { geoToVector3 } from './geoToVector3'

const localSurfaceNormal = new THREE.Vector3(0, 0, 1)

function easeInOutCubic(progress) {
  const value = THREE.MathUtils.clamp(progress, 0, 1)
  return value < 0.5
    ? 4 * value * value * value
    : 1 - (-2 * value + 2) ** 3 / 2
}

function intervalProgress(elapsed, start, end) {
  if (end <= start) return elapsed >= end ? 1 : 0
  return THREE.MathUtils.clamp((elapsed - start) / (end - start), 0, 1)
}

function setTubeProgress(geometry, progress, tubularSegments) {
  const indicesPerSegment = routeLayerGeometry.radialSegments * 6
  const visibleSegments = Math.min(
    tubularSegments,
    Math.floor(
      THREE.MathUtils.clamp(progress, 0, 1) * tubularSegments,
    ),
  )
  geometry.setDrawRange(0, visibleSegments * indicesPerSegment)
}

function setTubeWindow(geometry, start, end, tubularSegments) {
  const indicesPerSegment = routeLayerGeometry.radialSegments * 6
  const firstSegment = Math.max(
    0,
    Math.floor(start * tubularSegments),
  )
  const finalSegment = Math.min(
    tubularSegments,
    Math.ceil(end * tubularSegments),
  )
  geometry.setDrawRange(
    firstSegment * indicesPerSegment,
    Math.max(0, finalSegment - firstSegment) * indicesPerSegment,
  )
}

function createHaloTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128

  const context = canvas.getContext('2d')
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.82)')
  gradient.addColorStop(0.22, 'rgba(255, 255, 255, 0.44)')
  gradient.addColorStop(0.58, 'rgba(255, 255, 255, 0.12)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 128, 128)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function createBaseNode(location, haloTexture, resources) {
  const style = baseNodeStyles[location.role]
  const surfaceNormal = geoToVector3(
    location.latitude,
    location.longitude,
  ).normalize()
  const nodeGroup = new THREE.Group()
  nodeGroup.name = `footprints-base-${location.id}`
  nodeGroup.position
    .copy(surfaceNormal)
    .multiplyScalar(
      earthRadius + routeLayerGeometry.nodeSurfaceOffset,
    )
  nodeGroup.quaternion.setFromUnitVectors(
    localSurfaceNormal,
    surfaceNormal,
  )

  const dotGeometry = new THREE.SphereGeometry(
    style.dotRadius,
    16,
    12,
  )
  const dotMaterial = new THREE.MeshBasicMaterial({
    color: routeLayerPalette.node,
    depthTest: true,
    depthWrite: true,
    opacity: style.dotOpacity,
    transparent: true,
  })
  const dot = new THREE.Mesh(dotGeometry, dotMaterial)
  dot.position.z = style.dotRadius * 0.65

  const ringGeometry = new THREE.RingGeometry(
    style.ringInnerRadius,
    style.ringOuterRadius,
    40,
  )
  const ringMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: routeLayerPalette.nodeRing,
    depthTest: true,
    depthWrite: false,
    opacity: style.ringOpacity,
    side: THREE.DoubleSide,
    transparent: true,
  })
  const ring = new THREE.Mesh(ringGeometry, ringMaterial)
  ring.position.z = 0.0008

  const haloGeometry = new THREE.CircleGeometry(style.haloRadius, 48)
  const haloMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: routeLayerPalette.nodeHalo,
    depthTest: true,
    depthWrite: false,
    map: haloTexture,
    opacity: style.haloOpacity,
    side: THREE.DoubleSide,
    transparent: true,
  })
  const halo = new THREE.Mesh(haloGeometry, haloMaterial)
  halo.position.z = 0.0004

  const hitGeometry = new THREE.SphereGeometry(
    earthRadius * 0.038,
    10,
    8,
  )
  const hitMaterial = new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthTest: false,
    depthWrite: false,
    opacity: 0,
    transparent: true,
  })
  const hitMesh = new THREE.Mesh(hitGeometry, hitMaterial)
  hitMesh.userData.footprintsEntity = {
    baseId: location.id,
    id: location.id,
    kind: 'base',
    priority: 2,
  }
  resources.interactables.push(hitMesh)

  let progress = 0
  let emphasis = 1
  const applyVisualState = () => {
    const easedProgress = easeInOutCubic(progress)
    const scale = THREE.MathUtils.lerp(0.85, 1, easedProgress)
    nodeGroup.scale.setScalar(
      scale * THREE.MathUtils.lerp(0.96, 1.06, emphasis - 0.65),
    )
    dotMaterial.opacity = THREE.MathUtils.clamp(
      style.dotOpacity *
        THREE.MathUtils.lerp(0.1, 1, easedProgress) *
        emphasis,
      0,
      1,
    )
    ringMaterial.opacity = THREE.MathUtils.clamp(
      style.ringOpacity * easedProgress * emphasis,
      0,
      0.94,
    )
    haloMaterial.opacity = THREE.MathUtils.clamp(
      style.haloOpacity * easedProgress * emphasis,
      0,
      0.3,
    )
  }

  nodeGroup.add(halo, ring, dot, hitMesh)
  resources.geometries.push(
    dotGeometry,
    ringGeometry,
    haloGeometry,
    hitGeometry,
  )
  resources.materials.push(
    dotMaterial,
    ringMaterial,
    haloMaterial,
    hitMaterial,
  )
  return {
    baseId: location.id,
    group: nodeGroup,
    labelAnchor: dot,
    setEmphasis: (value) => {
      emphasis = value
      applyVisualState()
    },
    setProgress: (value) => {
      progress = THREE.MathUtils.clamp(value, 0, 1)
      applyVisualState()
    },
  }
}

function createRouteMeshes(route, resources) {
  const startLocation = footprintBaseLocationsById.get(route.from)
  const endLocation = footprintBaseLocationsById.get(route.to)

  if (!startLocation || !endLocation) {
    throw new Error(`Unknown Footprints route endpoint: ${route.id}`)
  }

  const curve = createRouteCurve({
    start: geoToVector3(
      startLocation.latitude,
      startLocation.longitude,
    ),
    end: geoToVector3(
      endLocation.latitude,
      endLocation.longitude,
    ),
    earthRadius,
    maxAltitude: route.maxAltitude,
    pointCount: route.pointCount,
    surfaceOffset: routeLayerGeometry.routeSurfaceOffset,
  })

  const routeGroup = new THREE.Group()
  routeGroup.name = `footprints-route-${route.id}`

  const coreGeometry = new THREE.TubeGeometry(
    curve,
    route.tubularSegments,
    route.coreRadius,
    routeLayerGeometry.radialSegments,
    false,
  )
  const coreMaterial = new THREE.MeshBasicMaterial({
    color: route.coreColor,
    depthTest: true,
    depthWrite: true,
    opacity: route.coreOpacity,
    transparent: route.coreOpacity < 1,
  })
  const core = new THREE.Mesh(coreGeometry, coreMaterial)

  const glowGeometry = new THREE.TubeGeometry(
    curve,
    route.tubularSegments,
    route.coreRadius * route.glowRadiusMultiplier,
    routeLayerGeometry.radialSegments,
    false,
  )
  const glowMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: route.glowColor,
    depthTest: true,
    depthWrite: false,
    opacity: route.glowOpacity,
    transparent: true,
  })
  const glow = new THREE.Mesh(glowGeometry, glowMaterial)

  const energyStyle = routeEnergyStyles[route.id]
  const energyGeometry = new THREE.TubeGeometry(
    curve,
    route.tubularSegments,
    route.coreRadius * energyStyle.radiusMultiplier,
    routeLayerGeometry.radialSegments,
    false,
  )
  const energyMaterial = new THREE.MeshBasicMaterial({
    blending: THREE.AdditiveBlending,
    color: energyStyle.color,
    depthTest: true,
    depthWrite: false,
    opacity: 0,
    transparent: true,
  })
  const energy = new THREE.Mesh(energyGeometry, energyMaterial)
  let progress = 0
  let emphasis = 1
  const applyRouteProgress = () => {
    const easedProgress = easeInOutCubic(progress)
    setTubeProgress(coreGeometry, easedProgress, route.tubularSegments)
    setTubeProgress(glowGeometry, easedProgress, route.tubularSegments)
    coreMaterial.opacity = THREE.MathUtils.clamp(
      route.coreOpacity * emphasis,
      0,
      1,
    )
    glowMaterial.opacity = THREE.MathUtils.clamp(
      route.glowOpacity * emphasis,
      0,
      0.22,
    )
  }

  const setEnergyProgress = (elapsedSeconds, isEnabled) => {
    if (!isEnabled) {
      energyGeometry.setDrawRange(0, 0)
      energyMaterial.opacity = 0
      return
    }

    const cycleProgress =
      (
        elapsedSeconds / energyStyle.cycleDuration +
        energyStyle.phaseOffset
      ) % 1
    const windowStart = Math.max(
      0,
      cycleProgress - energyStyle.length,
    )
    const fadeIn = THREE.MathUtils.smoothstep(cycleProgress, 0, 0.12)
    const fadeOut =
      1 - THREE.MathUtils.smoothstep(cycleProgress, 0.86, 1)

    setTubeWindow(
      energyGeometry,
      windowStart,
      cycleProgress,
      route.tubularSegments,
    )
    energyMaterial.opacity =
      energyStyle.opacity * Math.min(fadeIn, fadeOut) * emphasis
  }

  routeGroup.add(core, glow, energy)
  resources.geometries.push(
    coreGeometry,
    glowGeometry,
    energyGeometry,
  )
  resources.materials.push(
    coreMaterial,
    glowMaterial,
    energyMaterial,
  )
  return {
    from: route.from,
    group: routeGroup,
    id: route.id,
    setEmphasis: (value) => {
      emphasis = value
      applyRouteProgress()
    },
    setEnergyProgress,
    setProgress: (value) => {
      progress = THREE.MathUtils.clamp(value, 0, 1)
      applyRouteProgress()
    },
    to: route.to,
  }
}

function createSecondarySequence(routes, start, stagger) {
  const routeWindows = routes.map((route, index) => {
    const routeStart = start + index * stagger
    const routeEnd = routeStart + route.growthDuration
    const nodeEnd =
      routeEnd + secondaryRouteAnimation.nodeActivation

    return {
      ...route,
      nodeEnd,
      nodeStart: routeEnd,
      routeEnd,
      routeStart,
    }
  })

  return {
    end: routeWindows.reduce(
      (maximum, route) => Math.max(maximum, route.nodeEnd),
      start,
    ),
    routes: routeWindows,
    start,
  }
}

function createTimeline(secondaryRouteLayer) {
  let cursor = 0
  const earthSettleEnd = cursor += routeAnimationTiming.earthSettle
  const originActivationEnd =
    cursor += routeAnimationTiming.originActivation
  const firstRouteStart =
    cursor += routeAnimationTiming.originRoutePause
  const firstRouteEnd =
    cursor += routeAnimationTiming.firstRouteGrowth
  const stageActivationEnd =
    cursor += routeAnimationTiming.stageActivation
  const changchunSecondaryStart =
    cursor += secondaryRouteAnimation.basePause
  const changchunSecondary = createSecondarySequence(
    secondaryRouteLayer.animationsForBase('changchun'),
    changchunSecondaryStart,
    secondaryRouteAnimation.stagger.changchun,
  )
  cursor = changchunSecondary.end
  const secondRouteStart =
    cursor += routeAnimationTiming.stageRoutePause
  const secondRouteEnd =
    cursor += routeAnimationTiming.secondRouteGrowth
  const currentActivationEnd =
    cursor += routeAnimationTiming.currentActivation
  const kualaLumpurSecondaryStart =
    cursor += secondaryRouteAnimation.basePause
  const kualaLumpurSecondary = createSecondarySequence(
    secondaryRouteLayer.animationsForBase('kuala-lumpur'),
    kualaLumpurSecondaryStart,
    secondaryRouteAnimation.stagger['kuala-lumpur'],
  )
  cursor = kualaLumpurSecondary.end
  const complete = cursor += routeAnimationTiming.finalSettle

  return {
    changchunSecondary,
    complete,
    currentActivationEnd,
    currentActivationStart: secondRouteEnd,
    earthSettleEnd,
    firstRouteEnd,
    firstRouteStart,
    kualaLumpurSecondary,
    originActivationEnd,
    originActivationStart: earthSettleEnd,
    secondRouteEnd,
    secondRouteStart,
    stageActivationEnd,
    stageActivationStart: firstRouteEnd,
  }
}

function getAnimationPhase(elapsed, timeline) {
  if (elapsed < timeline.earthSettleEnd) return 'earth-settle'
  if (elapsed < timeline.originActivationEnd) return 'huizhou-activation'
  if (elapsed < timeline.firstRouteStart) return 'origin-route-pause'
  if (elapsed < timeline.firstRouteEnd) {
    return 'huizhou-changchun-growth'
  }
  if (elapsed < timeline.stageActivationEnd) {
    return 'changchun-activation'
  }
  if (elapsed < timeline.changchunSecondary.start) {
    return 'changchun-secondary-pause'
  }
  if (elapsed < timeline.changchunSecondary.end) {
    return 'changchun-secondary-growth'
  }
  if (elapsed < timeline.secondRouteStart) return 'stage-route-pause'
  if (elapsed < timeline.secondRouteEnd) {
    return 'changchun-kuala-lumpur-growth'
  }
  if (elapsed < timeline.currentActivationEnd) {
    return 'kuala-lumpur-activation'
  }
  if (elapsed < timeline.kualaLumpurSecondary.start) {
    return 'kuala-lumpur-secondary-pause'
  }
  if (elapsed < timeline.kualaLumpurSecondary.end) {
    return 'kuala-lumpur-secondary-growth'
  }
  if (elapsed < timeline.complete) return 'final-settle'
  return 'complete'
}

export function createFootprintsRouteLayer({
  onPhaseChange,
  onStateChange,
  reducedMotion,
}) {
  const group = new THREE.Group()
  const resources = {
    geometries: [],
    interactables: [],
    materials: [],
  }
  const haloTexture = createHaloTexture()
  const secondaryRouteLayer = createSecondaryRouteLayer()
  const routeControllers = new Map()
  const nodeControllers = new Map()
  const labelAnchors = new Map(
    secondaryRouteLayer.labelAnchors,
  )
  const timeline = createTimeline(secondaryRouteLayer)
  const animationState = {
    elapsedMilliseconds: 0,
    energyElapsedSeconds: 0,
    entryId: null,
    status: 'idle',
  }
  let currentPhase = 'idle'

  group.name = 'footprints-route-layer'
  group.add(secondaryRouteLayer.group)

  primaryLifeRoutes.forEach((route) => {
    const controller = createRouteMeshes(route, resources)
    routeControllers.set(route.id, controller)
    group.add(controller.group)
  })
  footprintBaseLocations.forEach((location) => {
    const controller = createBaseNode(location, haloTexture, resources)
    nodeControllers.set(location.id, controller)
    labelAnchors.set(`base:${location.id}`, controller.labelAnchor)
    group.add(controller.group)
  })

  const setPhase = (phase) => {
    if (phase === currentPhase) return
    currentPhase = phase
    onPhaseChange?.(phase)
  }

  const setStatus = (status) => {
    if (animationState.status === status) return
    animationState.status = status
    onStateChange?.(status)
  }

  const applySecondarySequence = (
    sequence,
    elapsedMilliseconds,
    destinationProgresses,
  ) => {
    sequence.routes.forEach((route) => {
      route.setProgress(
        intervalProgress(
          elapsedMilliseconds,
          route.routeStart,
          route.routeEnd,
        ),
      )
      const nodeProgress = intervalProgress(
        elapsedMilliseconds,
        route.nodeStart,
        route.nodeEnd,
      )
      destinationProgresses.set(
        route.destinationId,
        Math.max(
          destinationProgresses.get(route.destinationId) ?? 0,
          nodeProgress,
        ),
      )
    })
  }

  const applyTimeline = (elapsedMilliseconds) => {
    const destinationProgresses = new Map()
    nodeControllers.get('huizhou')?.setProgress(
      intervalProgress(
        elapsedMilliseconds,
        timeline.originActivationStart,
        timeline.originActivationEnd,
      ),
    )
    routeControllers.get('huizhou-changchun')?.setProgress(
      intervalProgress(
        elapsedMilliseconds,
        timeline.firstRouteStart,
        timeline.firstRouteEnd,
      ),
    )
    nodeControllers.get('changchun')?.setProgress(
      intervalProgress(
        elapsedMilliseconds,
        timeline.stageActivationStart,
        timeline.stageActivationEnd,
      ),
    )
    applySecondarySequence(
      timeline.changchunSecondary,
      elapsedMilliseconds,
      destinationProgresses,
    )
    routeControllers.get('changchun-kuala-lumpur')?.setProgress(
      intervalProgress(
        elapsedMilliseconds,
        timeline.secondRouteStart,
        timeline.secondRouteEnd,
      ),
    )
    nodeControllers.get('kuala-lumpur')?.setProgress(
      intervalProgress(
        elapsedMilliseconds,
        timeline.currentActivationStart,
        timeline.currentActivationEnd,
      ),
    )
    applySecondarySequence(
      timeline.kualaLumpurSecondary,
      elapsedMilliseconds,
      destinationProgresses,
    )
    secondaryRouteLayer.nodeControllers.forEach(
      (controller, destinationId) => {
        controller.setProgress(
          destinationProgresses.get(destinationId) ?? 0,
        )
      },
    )
    setPhase(getAnimationPhase(elapsedMilliseconds, timeline))
  }

  const setEnergyProgress = (elapsedSeconds, isEnabled) => {
    routeControllers.forEach((controller) => {
      controller.setEnergyProgress(elapsedSeconds, isEnabled)
    })
  }

  const setSelectedEntity = (entity) => {
    routeControllers.forEach((controller) => {
      controller.setEmphasis(1)
    })
    nodeControllers.forEach((controller) => {
      controller.setEmphasis(1)
    })
    secondaryRouteLayer.routeControllers.forEach((controller) => {
      controller.setEmphasis(1)
    })
    secondaryRouteLayer.nodeControllers.forEach((controller) => {
      controller.setEmphasis(1)
    })

    if (!entity) return

    if (entity.kind === 'destination') {
      secondaryRouteLayer.nodeControllers
        .get(entity.destinationId)
        ?.setEmphasis(1.14)
      secondaryRouteLayer.routeControllers.forEach((controller) => {
        if (controller.destinationId === entity.destinationId) {
          controller.setEmphasis(1.42)
        }
      })
      return
    }

    if (entity.kind === 'base') {
      nodeControllers.get(entity.baseId)?.setEmphasis(1.12)
    }
  }

  const prepare = () => {
    animationState.elapsedMilliseconds = 0
    animationState.energyElapsedSeconds = 0
    animationState.entryId = null
    secondaryRouteLayer.reset()
    applyTimeline(0)
    setEnergyProgress(0, false)
    setPhase('idle')
    setStatus('idle')
  }

  const completeImmediately = (entryId) => {
    animationState.entryId = entryId
    animationState.elapsedMilliseconds = timeline.complete
    animationState.energyElapsedSeconds = 0
    applyTimeline(timeline.complete)
    secondaryRouteLayer.complete()
    setEnergyProgress(0, false)
    setStatus('complete')
  }

  const start = ({ entryId } = {}) => {
    if (
      entryId != null &&
      animationState.entryId === entryId &&
      animationState.status !== 'idle'
    ) {
      return
    }

    if (reducedMotion) {
      completeImmediately(entryId)
      return
    }

    animationState.entryId = entryId
    animationState.elapsedMilliseconds = 0
    animationState.energyElapsedSeconds = 0
    secondaryRouteLayer.reset()
    applyTimeline(0)
    setEnergyProgress(0, false)
    setStatus('preparing')
    setStatus('playing')
  }

  const update = (deltaSeconds) => {
    if (animationState.status === 'playing') {
      animationState.elapsedMilliseconds = Math.min(
        timeline.complete,
        animationState.elapsedMilliseconds + deltaSeconds * 1000,
      )
      applyTimeline(animationState.elapsedMilliseconds)

      if (animationState.elapsedMilliseconds >= timeline.complete) {
        setStatus('complete')
      }
    }

    if (animationState.status === 'complete' && !reducedMotion) {
      animationState.energyElapsedSeconds += deltaSeconds
      setEnergyProgress(animationState.energyElapsedSeconds, true)
    }

    return animationState.elapsedMilliseconds
  }

  prepare()

  const dispose = () => {
    secondaryRouteLayer.dispose()
    resources.geometries.forEach((geometry) => geometry.dispose())
    resources.materials.forEach((material) => material.dispose())
    haloTexture.dispose()
  }

  return {
    dispose,
    group,
    interactables: [
      ...resources.interactables,
      ...secondaryRouteLayer.interactables,
    ],
    labelAnchors,
    prepare,
    setSelectedEntity,
    start,
    secondaryRouteSummary: secondaryRouteLayer.summary,
    timeline: {
      ...routeAnimationTiming,
      changchunSecondary: timeline.changchunSecondary.routes.map(
        ({ destinationId, firstVisit, growthDuration, routeStart }) => ({
          destinationId,
          firstVisit,
          growthDuration,
          start: routeStart,
        }),
      ),
      kualaLumpurSecondary: timeline.kualaLumpurSecondary.routes.map(
        ({ destinationId, firstVisit, growthDuration, routeStart }) => ({
          destinationId,
          firstVisit,
          growthDuration,
          start: routeStart,
        }),
      ),
      secondaryNodeActivation:
        secondaryRouteAnimation.nodeActivation,
      total: timeline.complete,
    },
    update,
  }
}
