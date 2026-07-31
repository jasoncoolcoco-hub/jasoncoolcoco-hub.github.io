import * as THREE from 'three/webgpu'
import { destinations } from '../../data/destinations'
import {
  getSecondaryRouteAltitude,
  getSecondaryRouteAltitudeProfileExponent,
  getSecondaryRouteDepartureBias,
  getSecondaryRouteGrowthDuration,
  getSecondaryRouteSegments,
  getSecondaryRouteVisualStyle,
  getSecondaryRoutesForBase,
  getSecondaryRoutesForDestination,
  secondaryNodeStyle,
  secondaryRouteDeparture,
  secondaryRoutes,
  secondaryRouteStyle,
  validateSecondaryRouteData,
} from '../../data/secondaryRoutes'
import { earthRadius } from '../../data/routes'
import { footprintBaseLocationsById } from '../../data/locations'
import { createRouteCurve } from './createRouteCurve'
import { geoToVector3 } from './geoToVector3'

const localSurfaceNormal = new THREE.Vector3(0, 0, 1)

function easeInOutCubic(progress) {
  const value = THREE.MathUtils.clamp(progress, 0, 1)
  return value < 0.5
    ? 4 * value * value * value
    : 1 - (-2 * value + 2) ** 3 / 2
}

function setTubeProgress(geometry, progress, tubularSegments) {
  const indicesPerSegment = secondaryRouteStyle.radialSegments * 6
  const visibleSegments = Math.min(
    tubularSegments,
    Math.floor(
      THREE.MathUtils.clamp(progress, 0, 1) * tubularSegments,
    ),
  )
  geometry.setDrawRange(0, visibleSegments * indicesPerSegment)
}

function setTubeWindow(geometry, start, end, tubularSegments) {
  const indicesPerSegment = secondaryRouteStyle.radialSegments * 6
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
  canvas.width = 64
  canvas.height = 64

  const context = canvas.getContext('2d')
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.72)')
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.28)')
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.06)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, 64, 64)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function angularDistanceBetween(start, end) {
  return Math.acos(
    THREE.MathUtils.clamp(
      start.clone().normalize().dot(end.clone().normalize()),
      -1,
      1,
    ),
  )
}

export function createSecondaryRouteLayer() {
  const validation = import.meta.env.DEV
    ? validateSecondaryRouteData()
    : {
        destinationCount: destinations.length,
        routeCount: secondaryRoutes.length,
        visitCount: secondaryRoutes.reduce(
          (total, route) => total + route.visitCount,
          0,
        ),
      }
  const group = new THREE.Group()
  const routeControllers = new Map()
  const nodeControllers = new Map()
  const labelAnchors = new Map()
  const interactables = []
  const routeGeometries = []
  const routeMaterials = []
  const nodeMaterials = []
  const haloTexture = createHaloTexture()

  group.name = 'footprints-secondary-route-layer'

  const hitMaterial = new THREE.MeshBasicMaterial({
    colorWrite: false,
    depthTest: false,
    depthWrite: false,
    opacity: 0,
    transparent: true,
  })
  const dotGeometry = new THREE.SphereGeometry(
    secondaryNodeStyle.dotRadius,
    12,
    8,
  )
  const nodeHitGeometry = new THREE.SphereGeometry(
    earthRadius * 0.032,
    10,
    8,
  )
  const ringGeometry = new THREE.RingGeometry(
    secondaryNodeStyle.ringInnerRadius,
    secondaryNodeStyle.ringOuterRadius,
    28,
  )
  const haloGeometry = new THREE.CircleGeometry(
    secondaryNodeStyle.haloRadius,
    32,
  )
  const destinationsById = new Map(
    destinations.map((destination) => [destination.id, destination]),
  )

  secondaryRoutes.forEach((route) => {
    const base = footprintBaseLocationsById.get(route.baseId)
    const destination = destinationsById.get(route.destinationId)
    const start = geoToVector3(base.latitude, base.longitude)
    const end = geoToVector3(
      destination.latitude,
      destination.longitude,
    )
    const angularDistance = angularDistanceBetween(start, end)
    const tubularSegments = getSecondaryRouteSegments(angularDistance)
    const visualStyle = getSecondaryRouteVisualStyle(angularDistance)
    const routeCoreRadius =
      secondaryRouteStyle.coreRadius *
      visualStyle.coreRadiusMultiplier
    const curve = createRouteCurve({
      altitudeProfileExponent:
        getSecondaryRouteAltitudeProfileExponent(angularDistance),
      departureBias: getSecondaryRouteDepartureBias(route),
      departureFalloffPower:
        secondaryRouteDeparture.falloffPower,
      start,
      end,
      earthRadius,
      maxAltitude: getSecondaryRouteAltitude(angularDistance),
      pointCount: Math.max(28, Math.round(tubularSegments * 0.7)),
      surfaceOffset: secondaryRouteStyle.routeSurfaceOffset,
    })
    const coreGeometry = new THREE.TubeGeometry(
      curve,
      tubularSegments,
      routeCoreRadius,
      secondaryRouteStyle.radialSegments,
      false,
    )
    const glowGeometry = new THREE.TubeGeometry(
      curve,
      tubularSegments,
      routeCoreRadius *
        secondaryRouteStyle.glowRadiusMultiplier,
      secondaryRouteStyle.radialSegments,
      false,
    )
    const tailGeometry = new THREE.TubeGeometry(
      curve,
      tubularSegments,
      routeCoreRadius *
        secondaryRouteStyle.head.tailRadiusMultiplier,
      secondaryRouteStyle.radialSegments,
      false,
    )
    const tipGeometry = new THREE.TubeGeometry(
      curve,
      tubularSegments,
      routeCoreRadius *
        secondaryRouteStyle.head.tipRadiusMultiplier,
      secondaryRouteStyle.radialSegments,
      false,
    )
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: secondaryRouteStyle.coreColor,
      depthTest: true,
      depthWrite: false,
      opacity: secondaryRouteStyle.coreOpacity,
      transparent: true,
    })
    const glowMaterial = new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: secondaryRouteStyle.glowColor,
      depthTest: true,
      depthWrite: false,
      opacity: secondaryRouteStyle.glowOpacity,
      transparent: true,
    })
    const tailMaterial = new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: secondaryRouteStyle.head.tailColor,
      depthTest: true,
      depthWrite: false,
      opacity: 0,
      transparent: true,
    })
    const tipMaterial = new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: secondaryRouteStyle.head.tipColor,
      depthTest: true,
      depthWrite: false,
      opacity: 0,
      transparent: true,
    })
    const routeGroup = new THREE.Group()
    routeGroup.name = `footprints-secondary-route-${route.id}`
    routeGroup.add(
      new THREE.Mesh(coreGeometry, coreMaterial),
      new THREE.Mesh(glowGeometry, glowMaterial),
      new THREE.Mesh(tailGeometry, tailMaterial),
      new THREE.Mesh(tipGeometry, tipMaterial),
    )
    routeGeometries.push(
      coreGeometry,
      glowGeometry,
      tailGeometry,
      tipGeometry,
    )
    routeMaterials.push(
      coreMaterial,
      glowMaterial,
      tailMaterial,
      tipMaterial,
    )
    group.add(routeGroup)

    const curveLength = curve.getLength()
    let progress = 0
    let emphasis = 1
    let settleProgress = 0
    const applyVisualState = () => {
      const activeCoreOpacity =
        secondaryRouteStyle.coreOpacity *
        visualStyle.coreOpacityMultiplier
      const activeGlowOpacity =
        secondaryRouteStyle.glowOpacity *
        visualStyle.glowOpacityMultiplier
      coreMaterial.opacity = THREE.MathUtils.clamp(
        THREE.MathUtils.lerp(
          activeCoreOpacity,
          activeCoreOpacity *
            secondaryRouteStyle.settledCoreOpacityMultiplier,
          settleProgress,
        ) * emphasis,
        0,
        0.78,
      )
      glowMaterial.opacity = THREE.MathUtils.clamp(
        THREE.MathUtils.lerp(
          activeGlowOpacity,
          activeGlowOpacity *
            secondaryRouteStyle.settledGlowOpacityMultiplier,
          settleProgress,
        ) * emphasis,
        0,
        0.08,
      )
      const easedProgress = easeInOutCubic(progress)
      setTubeProgress(coreGeometry, easedProgress, tubularSegments)
      setTubeProgress(glowGeometry, easedProgress, tubularSegments)

      if (progress <= 0 || progress >= 1) {
        tailGeometry.setDrawRange(0, 0)
        tipGeometry.setDrawRange(0, 0)
        tailMaterial.opacity = 0
        tipMaterial.opacity = 0
        return
      }

      const arrivalFade =
        1 - THREE.MathUtils.smoothstep(progress, 0.975, 1)
      const departureFade = THREE.MathUtils.smoothstep(
        progress,
        0,
        0.045,
      )
      const headOpacity = arrivalFade * departureFade * emphasis
      setTubeWindow(
        tailGeometry,
        Math.max(
          0,
          easedProgress - secondaryRouteStyle.head.tailLength,
        ),
        easedProgress,
        tubularSegments,
      )
      setTubeWindow(
        tipGeometry,
        Math.max(
          0,
          easedProgress - secondaryRouteStyle.head.tipLength,
        ),
        easedProgress,
        tubularSegments,
      )
      tailMaterial.opacity =
        secondaryRouteStyle.head.tailOpacity * headOpacity
      tipMaterial.opacity =
        secondaryRouteStyle.head.tipOpacity * headOpacity
    }

    routeControllers.set(route.id, {
      baseId: route.baseId,
      curveLength,
      destinationId: route.destinationId,
      firstVisit: route.firstVisit,
      growthDuration: getSecondaryRouteGrowthDuration(curveLength),
      id: route.id,
      setEmphasis: (value) => {
        emphasis = value
        applyVisualState()
      },
      setProgress: (value) => {
        progress = THREE.MathUtils.clamp(value, 0, 1)
        applyVisualState()
      },
      setSettleProgress: (value) => {
        settleProgress = THREE.MathUtils.clamp(value, 0, 1)
        applyVisualState()
      },
    })
  })

  destinations.forEach((destination) => {
    const destinationRoutes = getSecondaryRoutesForDestination(
      destination.id,
    )
    const routeIds = destinationRoutes.map((route) => route.id)
    const baseIds = destinationRoutes.map((route) => route.baseId)
    const surfaceNormal = geoToVector3(
      destination.latitude,
      destination.longitude,
    ).normalize()
    const nodeGroup = new THREE.Group()
    nodeGroup.name = `footprints-destination-${destination.id}`
    nodeGroup.position
      .copy(surfaceNormal)
      .multiplyScalar(
        earthRadius + secondaryNodeStyle.surfaceOffset,
      )
    nodeGroup.quaternion.setFromUnitVectors(
      localSurfaceNormal,
      surfaceNormal,
    )

    const dotMaterial = new THREE.MeshBasicMaterial({
      color: secondaryNodeStyle.color,
      depthTest: true,
      depthWrite: false,
      opacity: 0,
      transparent: true,
    })
    const ringMaterial = new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: secondaryNodeStyle.ringColor,
      depthTest: true,
      depthWrite: false,
      opacity: 0,
      side: THREE.DoubleSide,
      transparent: true,
    })
    const haloMaterial = new THREE.MeshBasicMaterial({
      blending: THREE.AdditiveBlending,
      color: secondaryNodeStyle.haloColor,
      depthTest: true,
      depthWrite: false,
      map: haloTexture,
      opacity: 0,
      side: THREE.DoubleSide,
      transparent: true,
    })
    nodeMaterials.push(dotMaterial, ringMaterial, haloMaterial)

    const halo = new THREE.Mesh(haloGeometry, haloMaterial)
    halo.position.z = 0.00025
    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.position.z = 0.0005
    const dot = new THREE.Mesh(dotGeometry, dotMaterial)
    dot.position.z = secondaryNodeStyle.dotRadius * 0.6
    const hitMesh = new THREE.Mesh(nodeHitGeometry, hitMaterial)
    hitMesh.userData.footprintsEntity = {
      baseIds,
      destinationId: destination.id,
      id: destination.id,
      kind: 'destination',
      priority: 3,
      routeIds,
    }
    interactables.push(hitMesh)

    let progress = 0
    let emphasis = 1
    const applyVisualState = () => {
      const easedProgress = easeInOutCubic(progress)
      nodeGroup.visible = progress > 0.001
      nodeGroup.scale.setScalar(
        THREE.MathUtils.lerp(0.88, 1, easedProgress) *
          THREE.MathUtils.lerp(0.94, 1.08, emphasis - 0.55),
      )
      dotMaterial.opacity = THREE.MathUtils.clamp(
        secondaryNodeStyle.dotOpacity *
          THREE.MathUtils.lerp(0.08, 1, easedProgress) *
          emphasis,
        0,
        0.96,
      )
      ringMaterial.opacity = THREE.MathUtils.clamp(
        secondaryNodeStyle.ringOpacity * easedProgress * emphasis,
        0,
        0.68,
      )
      haloMaterial.opacity = THREE.MathUtils.clamp(
        secondaryNodeStyle.haloOpacity * easedProgress * emphasis,
        0,
        0.13,
      )
    }

    nodeGroup.add(halo, ring, dot, hitMesh)
    const controller = {
      baseIds,
      destinationId: destination.id,
      group: nodeGroup,
      routeIds,
      setEmphasis: (value) => {
        emphasis = value
        applyVisualState()
      },
      setProgress: (value) => {
        progress = THREE.MathUtils.clamp(value, 0, 1)
        applyVisualState()
      },
    }
    nodeControllers.set(destination.id, controller)
    labelAnchors.set(`destination:${destination.id}`, dot)
    group.add(nodeGroup)
  })

  const animationsForBase = (baseId) =>
    getSecondaryRoutesForBase(baseId).map((route) =>
      routeControllers.get(route.id),
    )

  const reset = () => {
    routeControllers.forEach((controller) => {
      controller.setSettleProgress(0)
      controller.setProgress(0)
    })
    nodeControllers.forEach((controller) => controller.setProgress(0))
  }

  const complete = () => {
    routeControllers.forEach((controller) => {
      controller.setProgress(1)
      controller.setSettleProgress(1)
    })
    nodeControllers.forEach((controller) => controller.setProgress(1))
  }

  reset()

  const dispose = () => {
    routeGeometries.forEach((geometry) => geometry.dispose())
    dotGeometry.dispose()
    nodeHitGeometry.dispose()
    ringGeometry.dispose()
    haloGeometry.dispose()
    hitMaterial.dispose()
    routeMaterials.forEach((material) => material.dispose())
    nodeMaterials.forEach((material) => material.dispose())
    haloTexture.dispose()
  }

  return {
    animationsForBase,
    complete,
    dispose,
    group,
    interactables,
    labelAnchors,
    reset,
    routeControllers,
    nodeControllers,
    summary: validation,
  }
}
