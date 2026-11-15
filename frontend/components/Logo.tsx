export function Logo({ size = 32, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2" role="img" aria-label="OneMass">
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="16" fill="var(--color-maroon-600)" />
        <rect x="11" y="19" width="20" height="27" rx="10" fill="none" stroke="#fff" strokeWidth="4.8" />
        <path d="M34 46V19L42.5 32L51 19V46" fill="none" stroke="#fff" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {withText && (
        <span className="hidden text-[17px] font-semibold tracking-tight text-ink sm:inline">
          One<span className="text-maroon-600">Mass</span>
        </span>
      )}
    </div>
  );
}
