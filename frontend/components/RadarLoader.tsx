export function RadarLoader({ message = "Getting your day ready", compact = false }: { message?: string; compact?: boolean }) {
  return (
    <div role="status" aria-live="polite" className={`sam-loading ${compact ? "sam-loading-compact" : "sam-loading-screen"}`}>
      <div className="sam-run-stage" aria-hidden="true">
        <div className="sam-run-sprite" />
        <span className="sam-run-ground" />
      </div>
      <p className="sam-loading-message">{message}<span aria-hidden="true">…</span></p>
      <span className="sr-only">Loading, please wait.</span>
    </div>
  );
}
