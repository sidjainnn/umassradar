export function Logo({ size = 32, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <svg className="drop-shadow-[0_5px_12px_rgba(132,0,40,0.18)]" width={size} height={size} viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="18" fill="#840028" />
        <circle cx="32" cy="32" r="18" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="3" />
        <circle cx="32" cy="32" r="9" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="3" />
        <path d="M32 32 L46 18" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <circle cx="32" cy="32" r="4" fill="#fff" />
        <circle cx="43" cy="40" r="3" fill="#fff" />
      </svg>
      {withText && (
        <span className="hidden text-[17px] font-semibold tracking-tight text-ink sm:inline">
          UMass <span className="text-maroon-600">Radar</span>
        </span>
      )}
    </div>
  );
}
