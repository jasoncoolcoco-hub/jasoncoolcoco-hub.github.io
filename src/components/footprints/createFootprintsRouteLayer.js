import * as THREE from 'three/webgpu'
import {
  baseNodeStyles,
  earthRadius,
  primaryLifeRoutes,
  routeLayerGeometry,
  routeLayerPalette,
} from '../../data/routes'
import {
  footprintBaseLocations,
  footprintBaseLocationsById,
} from '../../data/locations'
import { createRouteCurve } from './createRouteCurve'
import { geoToVector3 } from './geoToVector3'

const localSurfaceNormal = new THREE.Vector3(0, 0, 1)

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
    transparent: style.dotOpacity < 1,
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

  nodeGroup.add(halo, ring, dot)
  resources.geometries.push(dotGeometry, ringGeometry, haloGeometry)
  resources.materials.push(dotMaterial, ringMaterial, haloMaterial)
  return nodeGroup
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

  routeGroup.add(core, glow)
  resources.geometries.push(coreGeometry, glowGeometry)
  resources.materials.push(coreMaterial, glowMaterial)
  return routeGroup
}

export function createFootprintsRouteLayer() {
  const group = new THREE.Group()
  const resources = {
    geometries: [],
    materials: [],
  }
  const haloTexture = createHaloTexture()

  group.name = 'footprints-route-layer'

  primaryLifeRoutes.forEach((route) => {
    group.add(createRouteMeshes(route, resources))
  })
  footprintBaseLocations.forEach((location) => {
    group.add(createBaseNode(location, haloTexture, resources))
  })

  const dispose = () => {
    resources.geometries.forEach((geometry) => geometry.dispose())
    resources.materials.forEach((material) => material.dispose())
    haloTexture.dispose()
  }

  return {
    dispose,
    group,
  }
}
