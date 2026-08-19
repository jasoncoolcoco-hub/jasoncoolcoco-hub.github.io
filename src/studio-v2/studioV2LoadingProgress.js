export const STUDIO_V2_LOADING_STAGES = Object.freeze([
  Object.freeze({ id: 'initialising', label: 'INITIALIZING SPACE', threshold: 0 }),
  Object.freeze({ id: 'light', label: 'PREPARING LIGHT', threshold: 18 }),
  Object.freeze({ id: 'memories', label: 'DEVELOPING MEMORIES', threshold: 55 }),
  Object.freeze({ id: 'finalising', label: 'FINALIZING STUDIO', threshold: 88 }),
  Object.freeze({ id: 'ready', label: 'READY', threshold: 100 }),
])

export function studioV2LoadingStage(progress, ready = false) {
  const boundedProgress = Number.isFinite(Number(progress))
    ? Math.min(100, Math.max(0, Number(progress)))
    : 0
  if (ready || boundedProgress >= 100) return STUDIO_V2_LOADING_STAGES.at(-1)
  return STUDIO_V2_LOADING_STAGES.reduce((activeStage, stage) => (
    stage.threshold <= boundedProgress ? stage : activeStage
  ), STUDIO_V2_LOADING_STAGES[0])
}
