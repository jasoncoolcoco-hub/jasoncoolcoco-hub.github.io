export const STUDIO_V2_MACBOOK_SITE_STATES = Object.freeze({
  CLOSED: 'CLOSED',
  OPENING: 'OPENING',
  OPEN: 'OPEN',
  CLOSING: 'CLOSING',
})

export const STUDIO_V2_MACBOOK_SITE_PHASES = Object.freeze({
  CLOSED: 'CLOSED',
  LAUNCHING: 'MACBOOK_CHROME_LAUNCHING',
  ENTERING: 'MACBOOK_SITE_TRANSITION_IN',
  SITE: 'MACBOOK_SITE_MODE',
  EXIT_DARKEN: 'MACBOOK_SITE_EXIT_DARKEN',
  EXIT_COVER: 'MACBOOK_SITE_EXIT_COVER',
  EXIT_HOLD: 'MACBOOK_SITE_EXIT_HOLD',
  EXIT_REVEAL: 'MACBOOK_SITE_EXIT_REVEAL',
})

export const STUDIO_V2_MACBOOK_SITE_CONFIG = Object.freeze({
  defaultLaunchDurationMs: 160,
  reducedMotionDurationMs: 1,
  transitionDurationMs: 280,
  exitDarkenDurationMs: 120,
  exitCoverDurationMs: 70,
  exitOcclusionHoldMs: 65,
  exitRevealDurationMs: 155,
})

export function studioV2MacbookSiteCanOpen(cameraState, siteState) {
  return cameraState === 'MACBOOK_FOCUS'
    && siteState === STUDIO_V2_MACBOOK_SITE_STATES.CLOSED
}

export function studioV2MacbookSiteLocksStudio(siteState) {
  return siteState !== STUDIO_V2_MACBOOK_SITE_STATES.CLOSED
}

export function studioV2MacbookSiteCanTransition(currentState, nextState) {
  return {
    [STUDIO_V2_MACBOOK_SITE_STATES.CLOSED]: STUDIO_V2_MACBOOK_SITE_STATES.OPENING,
    [STUDIO_V2_MACBOOK_SITE_STATES.OPENING]: STUDIO_V2_MACBOOK_SITE_STATES.OPEN,
    [STUDIO_V2_MACBOOK_SITE_STATES.OPEN]: STUDIO_V2_MACBOOK_SITE_STATES.CLOSING,
    [STUDIO_V2_MACBOOK_SITE_STATES.CLOSING]: STUDIO_V2_MACBOOK_SITE_STATES.CLOSED,
  }[currentState] === nextState
}
