export const footprintLabelOffsets = {
  huizhou: { x: -22, y: -22 },
  changchun: { x: 14, y: -16 },
  'kuala-lumpur': { x: -26, y: -2 },
  chicago: { x: -12, y: -16 },
  vladivostok: { x: 14, y: -14 },
  singapore: { x: 18, y: 18 },
  bangkok: { x: -12, y: -14 },
  phuket: { x: -26, y: -8 },
  jakarta: { x: -14, y: 14 },
  bali: { x: 12, y: 10 },
  kuching: { x: 20, y: 18 },
  'kota-kinabalu': { x: 20, y: -18 },
  hawaii: { x: 14, y: -14 },
  'los-angeles': { x: 14, y: -14 },
  'hong-kong': { x: 22, y: 8 },
  macau: { x: -26, y: 14 },
  taipei: { x: 20, y: -6 },
  tokyo: { x: 18, y: -18 },
  seoul: { x: -22, y: -18 },
}

export const footprintLabelVisibility = {
  boundsPaddingPx: 2,
  fadeOutFacingThreshold: 0.48,
  fadeInFacingThreshold: 0.72,
  hideSafeRadiusRatio: 0.89,
  hideTransitionMs: 480,
  interactionOpacityThreshold: 0.72,
  showSafeRadiusRatio: 0.84,
  showStableFrames: 6,
  showTransitionMs: 460,
  unlockTransitionMs: 420,
  viewportMarginPx: 18,
}

export function formatVisitMonth(visit) {
  return visit.replace('-', '.')
}
