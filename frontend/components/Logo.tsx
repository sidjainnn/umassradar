export function Logo({
  size = 36,
  withText = true,
}: {
  size?: number;
  withText?: boolean;
}) {
  return (
    <div className="radar-logo">
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <rect width="40" height="40" rx="12" fill="#881C1C" />
        <circle cx="20" cy="20" r="12" stroke="white" strokeOpacity=".35" />
        <circle cx="20" cy="20" r="7" stroke="white" strokeOpacity=".55" />
        <path
          d="M20 20 29 11"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="20" cy="20" r="2.5" fill="white" />
        <circle cx="26" cy="26" r="2" fill="#efb5a6" />
      </svg>
      {withText && (
        <span>
          <strong>
            UMass Radar<span className="brand-dot">.</span>
          </strong>
          <small>A little clarity for your day</small>
        </span>
      )}
    </div>
  );
}
