import {
  STUDIO_V2_LOADING_STAGES,
  studioV2LoadingStage,
} from './studioV2LoadingProgress'

export default function StudioV2Loading({
  error,
  exiting = false,
  progress,
  ready = false,
  visible,
  onRetry,
}) {
  if (!visible) return null
  const boundedProgress = ready ? 100 : Math.min(99.9, Math.max(0, Number(progress) || 0))
  const roundedProgress = ready ? 100 : Math.floor(boundedProgress)
  const activeStage = studioV2LoadingStage(boundedProgress, ready)

  return (
    <div
      className={`studio-v2__loading${error ? ' studio-v2__loading--error' : ''}${exiting ? ' studio-v2__loading--exiting' : ''}`}
      data-loading-state={error ? 'error' : ready ? 'ready' : 'loading'}
      data-loading-stage={error ? 'error' : activeStage.id}
      data-testid="studio-v2-loading-cover"
      role="status"
      aria-live="polite"
    >
      <div className="studio-v2__loading-content">
        <header className="studio-v2__loading-identity">
          <strong>JASON PERSONAL WEBSITE</strong>
          <span>A PERSONAL DIGITAL SPACE</span>
        </header>
        {error ? (
          <section className="studio-v2__loading-error-panel">
            <p>THE STUDIO COULD NOT BE LOADED</p>
            <span className="studio-v2__loading-error">{error}</span>
            <button type="button" onClick={onRetry}>RETRY</button>
          </section>
        ) : (
          <>
            <section className="studio-v2__loading-hero">
              <p className="studio-v2__loading-percentage">
                <span>{roundedProgress}</span>
                <small>%</small>
              </p>
              <p className="studio-v2__loading-status">{activeStage.label}</p>
            </section>
            <footer className="studio-v2__loading-footer">
              <div
                className="studio-v2__progress"
                aria-label={`${roundedProgress}% loaded`}
                aria-valuemax="100"
                aria-valuemin="0"
                aria-valuenow={roundedProgress}
                role="progressbar"
              >
                <span style={{ transform: `scaleX(${boundedProgress / 100})` }} />
              </div>
              <ol className="studio-v2__loading-stages" aria-label="Loading stages">
                {STUDIO_V2_LOADING_STAGES.map((stage) => (
                  <li
                    className={stage.id === activeStage.id ? 'is-active' : undefined}
                    key={stage.id}
                  >
                    {stage.label}
                  </li>
                ))}
              </ol>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}
