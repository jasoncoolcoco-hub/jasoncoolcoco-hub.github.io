export const earthRadius = 1

export const routeLayerPalette = {
  core: '#f0a04a',
  currentCore: '#f4a64f',
  glow: '#c97828',
  currentGlow: '#d9842e',
  node: '#f5b25a',
  nodeRing: '#e9a04b',
  nodeHalo: '#d88932',
}

export const routeLayerGeometry = {
  radialSegments: 8,
  routeSurfaceOffset: earthRadius * 0.004,
  nodeSurfaceOffset: earthRadius * 0.005,
}

export const baseNodeStyles = {
  origin: {
    dotRadius: earthRadius * 0.0036,
    dotOpacity: 0.9,
    ringInnerRadius: earthRadius * 0.0074,
    ringOuterRadius: earthRadius * 0.0092,
    ringOpacity: 0.62,
    haloRadius: earthRadius * 0.018,
    haloOpacity: 0.16,
  },
  stage: {
    dotRadius: earthRadius * 0.0038,
    dotOpacity: 0.94,
    ringInnerRadius: earthRadius * 0.0078,
    ringOuterRadius: earthRadius * 0.0098,
    ringOpacity: 0.7,
    haloRadius: earthRadius * 0.019,
    haloOpacity: 0.18,
  },
  current: {
    dotRadius: earthRadius * 0.0041,
    dotOpacity: 1,
    ringInnerRadius: earthRadius * 0.0082,
    ringOuterRadius: earthRadius * 0.0105,
    ringOpacity: 0.8,
    haloRadius: earthRadius * 0.021,
    haloOpacity: 0.22,
  },
}

export const primaryLifeRoutes = [
  {
    id: 'huizhou-changchun',
    from: 'huizhou',
    to: 'changchun',
    maxAltitude: earthRadius * 0.145,
    pointCount: 56,
    tubularSegments: 72,
    coreRadius: earthRadius * 0.0023,
    coreColor: routeLayerPalette.core,
    coreOpacity: 0.9,
    glowRadiusMultiplier: 3,
    glowColor: routeLayerPalette.glow,
    glowOpacity: 0.12,
  },
  {
    id: 'changchun-kuala-lumpur',
    from: 'changchun',
    to: 'kuala-lumpur',
    maxAltitude: earthRadius * 0.22,
    pointCount: 80,
    tubularSegments: 108,
    coreRadius: earthRadius * 0.0024,
    coreColor: routeLayerPalette.currentCore,
    coreOpacity: 0.94,
    glowRadiusMultiplier: 3.1,
    glowColor: routeLayerPalette.currentGlow,
    glowOpacity: 0.14,
  },
]
