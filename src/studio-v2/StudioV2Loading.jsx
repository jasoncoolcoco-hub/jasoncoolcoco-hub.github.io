export default function StudioV2Loading({ error, progress, visible, onRetry }) {
  if (!visible) return null
  const roundedProgress = Math.round(progress)

  return (
    <div className={`studio-v2__loading${error ? ' studio-v2__loading--error' : ''}`} role="status" aria-live="polite">
      <div className="studio-v2__loading-content">
        <span className="studio-v2__loading-kicker">FRED STUDIO / V2</span>
        <p>{error ? 'THE STUDIO COULD NOT BE LOADED' : 'LOADING STUDIO'}</p>
        {error ? (
          <>
            <span className="studio-v2__loading-error">{error}</span>
            <button type="button" onClick={onRetry}>RETRY</button>
          </>
        ) : (
          <>
            <div className="studio-v2__progress" aria-label={`${roundedProgress}% loaded`}>
              <span style={{ transform: `scaleX(${Math.max(0.01, progress / 100)})` }} />
            </div>
            <span className="studio-v2__loading-percentage">{roundedProgress}%</span>
          </>
        )}
      </div>
    </div>
  )
}
