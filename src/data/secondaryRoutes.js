import {
  destinations,
  destinationsById,
} from './destinations'
import {
  footprintBaseLocations,
  footprintBaseLocationsById,
} from './locations'
import { earthRadius } from './routes'

function lerp(start, end, progress) {
  return start + (end - start) * progress
}

export const secondaryRouteStyle = {
  coreColor: '#91bdd2',
  coreOpacity: 0.48,
  coreRadius: earthRadius * 0.00108,
  distance: {
    longCoreOpacityMultiplier: 1,
    longCoreRadiusMultiplier: 0.98,
    longGlowOpacityMultiplier: 1,
    shortCoreOpacityMultiplier: 0.84,
    shortCoreRadiusMultiplier: 0.88,
    shortGlowOpacityMultiplier: 0.56,
  },
  glowColor: '#5f91aa',
  glowOpacity: 0.032,
  glowRadiusMultiplier: 1.9,
  head: {
    tailColor: '#abd9e8',
    tailLength: 0.046,
    tailOpacity: 0.18,
    tailRadiusMultiplier: 1.07,
    tipColor: '#e3f7ff',
    tipLength: 0.013,
    tipOpacity: 0.7,
    tipRadiusMultiplier: 1.08,
  },
  radialSegments: 6,
  routeSurfaceOffset: earthRadius * 0.0035,
  settledCoreOpacityMultiplier: 0.72,
  settledGlowOpacityMultiplier: 0.48,
}

export const secondaryNodeStyle = {
  color: '#8ed5ff',
  dotOpacity: 0.72,
  dotRadius: earthRadius * 0.0025,
  haloColor: '#4a9bd8',
  haloOpacity: 0.08,
  haloRadius: earthRadius * 0.0105,
  ringColor: '#78c8ff',
  ringInnerRadius: earthRadius * 0.0048,
  ringOpacity: 0.46,
  ringOuterRadius: earthRadius * 0.0063,
  surfaceOffset: earthRadius * 0.0045,
}

export const secondaryRouteAltitude = {
  distanceExponent: 0.92,
  longProfileExponent: 0.82,
  maximum: earthRadius * 0.205,
  maximumAngularDistance: 2.25,
  minimum: earthRadius * 0.055,
  minimumAngularDistance: 0.04,
  shortProfileExponent: 1.08,
}

export const secondaryRouteDeparture = {
  falloffPower: 4.2,
  maximumBias: 0.05,
}

export const secondaryRouteAnimation = {
  basePause: 180,
  duration: {
    base: 760,
    curveLengthMultiplier: 600,
    maximum: 1850,
    minimum: 700,
  },
  nodeActivation: 320,
  stagger: {
    changchun: 150,
    'kuala-lumpur': 130,
  },
}

const secondaryRouteRecords = [
  {
    id: 'changchun-chicago',
    baseId: 'changchun',
    destinationId: 'chicago',
    visits: ['2019-02'],
  },
  {
    id: 'changchun-vladivostok',
    baseId: 'changchun',
    destinationId: 'vladivostok',
    visits: ['2019-03'],
  },
  {
    id: 'kuala-lumpur-singapore',
    baseId: 'kuala-lumpur',
    destinationId: 'singapore',
    visits: ['2024-01', '2024-03', '2025-03'],
  },
  {
    id: 'kuala-lumpur-bangkok',
    baseId: 'kuala-lumpur',
    destinationId: 'bangkok',
    visits: ['2023-06', '2026-05'],
  },
  {
    id: 'kuala-lumpur-phuket',
    baseId: 'kuala-lumpur',
    destinationId: 'phuket',
    visits: ['2023-07', '2024-05', '2026-03'],
  },
  {
    id: 'kuala-lumpur-jakarta',
    baseId: 'kuala-lumpur',
    destinationId: 'jakarta',
    visits: ['2023-03', '2023-10', '2024-11'],
  },
  {
    id: 'kuala-lumpur-bali',
    baseId: 'kuala-lumpur',
    destinationId: 'bali',
    visits: ['2024-02', '2026-02'],
  },
  {
    id: 'kuala-lumpur-kuching',
    baseId: 'kuala-lumpur',
    destinationId: 'kuching',
    visits: ['2024-06'],
  },
  {
    id: 'kuala-lumpur-kota-kinabalu',
    baseId: 'kuala-lumpur',
    destinationId: 'kota-kinabalu',
    visits: ['2023-10'],
  },
  {
    id: 'kuala-lumpur-hawaii',
    baseId: 'kuala-lumpur',
    destinationId: 'hawaii',
    visits: ['2026-03'],
  },
  {
    id: 'kuala-lumpur-los-angeles',
    baseId: 'kuala-lumpur',
    destinationId: 'los-angeles',
    visits: ['2026-03'],
  },
  {
    id: 'kuala-lumpur-hong-kong',
    baseId: 'kuala-lumpur',
    destinationId: 'hong-kong',
    visits: ['2023-03', '2023-04', '2023-09', '2023-10'],
  },
  {
    id: 'kuala-lumpur-macau',
    baseId: 'kuala-lumpur',
    destinationId: 'macau',
    visits: ['2024-03', '2025-10'],
  },
  {
    id: 'kuala-lumpur-taipei',
    baseId: 'kuala-lumpur',
    destinationId: 'taipei',
    visits: ['2024-09', '2025-07'],
  },
  {
    id: 'kuala-lumpur-tokyo',
    baseId: 'kuala-lumpur',
    destinationId: 'tokyo',
    visits: ['2025-02'],
  },
  {
    id: 'changchun-seoul',
    baseId: 'changchun',
    destinationId: 'seoul',
    visits: ['2019-01'],
  },
  {
    id: 'kuala-lumpur-seoul',
    baseId: 'kuala-lumpur',
    destinationId: 'seoul',
    visits: ['2025-02'],
  },
]

export const secondaryRoutes = secondaryRouteRecords.map(
  (route, configIndex) => ({
    ...route,
    configIndex,
    firstVisit: route.visits[0],
    type: 'secondary',
    visitCount: route.visits.length,
  }),
)

export const secondaryRoutesByDestinationId = secondaryRoutes.reduce(
  (routesByDestination, route) => {
    const destinationRoutes =
      routesByDestination.get(route.destinationId) ?? []
    destinationRoutes.push(route)
    routesByDestination.set(route.destinationId, destinationRoutes)
    return routesByDestination
  },
  new Map(),
)

export function getSecondaryRoutesForBase(baseId) {
  return secondaryRoutes
    .filter((route) => route.baseId === baseId)
    .sort(
      (first, second) =>
        first.firstVisit.localeCompare(second.firstVisit) ||
        first.configIndex - second.configIndex,
    )
}

export function getSecondaryRoutesForDestination(destinationId) {
  return secondaryRoutesByDestinationId.get(destinationId) ?? []
}

export function getDestinationVisits(destinationId) {
  return getSecondaryRoutesForDestination(destinationId)
    .flatMap((route) => route.visits)
    .sort()
}

export function getSecondaryRouteGrowthDuration(curveLength) {
  const { duration } = secondaryRouteAnimation
  return Math.min(
    duration.maximum,
    Math.max(
      duration.minimum,
      duration.base + curveLength * duration.curveLengthMultiplier,
    ),
  )
}

export function getSecondaryRouteAltitude(angularDistance) {
  const normalizedDistance = getSecondaryRouteDistanceProgress(
    angularDistance,
  )
  const distanceWeight =
    normalizedDistance ** secondaryRouteAltitude.distanceExponent

  return (
    secondaryRouteAltitude.minimum +
    (
      secondaryRouteAltitude.maximum -
      secondaryRouteAltitude.minimum
    ) *
      distanceWeight
  )
}

export function getSecondaryRouteAltitudeProfileExponent(
  angularDistance,
) {
  return lerp(
    secondaryRouteAltitude.shortProfileExponent,
    secondaryRouteAltitude.longProfileExponent,
    getSecondaryRouteDistanceProgress(angularDistance),
  )
}

export function getSecondaryRouteDepartureBias(route) {
  if (route.baseId !== 'kuala-lumpur') return 0

  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  return (
    Math.sin((route.configIndex + 1) * goldenAngle) *
    secondaryRouteDeparture.maximumBias
  )
}

export function getSecondaryRouteDistanceProgress(angularDistance) {
  const normalizedDistance = Math.min(
    1,
    Math.max(
      0,
      (
        angularDistance -
        secondaryRouteAltitude.minimumAngularDistance
      ) /
        (
          secondaryRouteAltitude.maximumAngularDistance -
          secondaryRouteAltitude.minimumAngularDistance
        ),
    ),
  )
  return normalizedDistance
}

export function getSecondaryRouteVisualStyle(angularDistance) {
  const distanceProgress = getSecondaryRouteDistanceProgress(
    angularDistance,
  )
  const { distance } = secondaryRouteStyle

  return {
    coreOpacityMultiplier: lerp(
      distance.shortCoreOpacityMultiplier,
      distance.longCoreOpacityMultiplier,
      distanceProgress,
    ),
    coreRadiusMultiplier: lerp(
      distance.shortCoreRadiusMultiplier,
      distance.longCoreRadiusMultiplier,
      distanceProgress,
    ),
    glowOpacityMultiplier: lerp(
      distance.shortGlowOpacityMultiplier,
      distance.longGlowOpacityMultiplier,
      distanceProgress,
    ),
  }
}

export function getSecondaryRouteSegments(angularDistance) {
  return Math.min(
    92,
    Math.max(40, Math.round(36 + angularDistance * 24)),
  )
}

export function validateSecondaryRouteData() {
  const destinationIds = new Set()
  const routeIds = new Set()
  const routeKeys = new Set()
  let visitCount = 0

  destinations.forEach((destination) => {
    if (destinationIds.has(destination.id)) {
      throw new Error(`Duplicate destination id: ${destination.id}`)
    }
    destinationIds.add(destination.id)
  })

  secondaryRoutes.forEach((route) => {
    if (routeIds.has(route.id)) {
      throw new Error(`Duplicate secondary route id: ${route.id}`)
    }
    routeIds.add(route.id)

    const routeKey = `${route.baseId}:${route.destinationId}`
    if (routeKeys.has(routeKey)) {
      throw new Error(`Duplicate secondary route: ${routeKey}`)
    }
    routeKeys.add(routeKey)

    if (!destinationsById.has(route.destinationId)) {
      throw new Error(
        `Unknown destination ${route.destinationId} for ${route.id}`,
      )
    }
    if (!footprintBaseLocationsById.has(route.baseId)) {
      throw new Error(`Unknown base ${route.baseId} for ${route.id}`)
    }

    const uniqueVisits = new Set(route.visits)
    if (uniqueVisits.size !== route.visits.length) {
      throw new Error(`Duplicate visit month for ${route.id}`)
    }
    const sortedVisits = [...route.visits].sort()
    if (
      route.visits.some(
        (visit, index) =>
          !/^\d{4}-(0[1-9]|1[0-2])$/.test(visit) ||
          visit !== sortedVisits[index],
      )
    ) {
      throw new Error(
        `Visits must be sorted YYYY-MM values for ${route.id}`,
      )
    }
    if (
      route.firstVisit !== route.visits[0] ||
      route.visitCount !== route.visits.length
    ) {
      throw new Error(`Incorrect visit metadata for ${route.id}`)
    }
    visitCount += route.visitCount
  })

  if (destinationIds.size !== destinations.length) {
    throw new Error('Destination validation count mismatch')
  }
  if (
    footprintBaseLocations.length !==
    footprintBaseLocationsById.size
  ) {
    throw new Error('Base location ids must be unique')
  }

  return {
    destinationCount: destinations.length,
    routeCount: secondaryRoutes.length,
    visitCount,
  }
}
