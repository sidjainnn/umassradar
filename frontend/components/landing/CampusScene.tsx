/** The UMass skyline in maroon tints: Du Bois Library, Old Chapel, the Campus Pond and the hills. Decorative. */
export function CampusScene({ shift = { x: 0, y: 0 } }: { shift?: { x: number; y: number } }) {
  const layer = (depth: number) => ({
    transform: `translate3d(${shift.x * depth}px, ${shift.y * depth * 0.5}px, 0)`,
    transition: "transform 300ms cubic-bezier(.2,.8,.2,1)",
  });
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#fbeef2_0%,#fdf6f8_55%,#ffffff_100%)]" />
      {/* sun */}
      <div style={layer(4)} className="absolute right-[5%] top-[3%] h-16 w-16 sm:right-[14%] sm:top-[12%] sm:h-24 sm:w-24 rounded-full bg-[radial-gradient(circle,#ffe7a3_0%,#ffd45c_55%,rgba(255,199,44,0)_72%)] opacity-80" />
      {/* clouds */}
      <div style={layer(10)} className="absolute left-[6%] top-[18%]">
        <div className="cloud h-10 w-40 rounded-full bg-white shadow-[0_12px_30px_rgba(132,0,40,0.06)] after:absolute after:-top-5 after:left-8 after:h-12 after:w-16 after:rounded-full after:bg-white" />
      </div>
      <div style={layer(14)} className="absolute right-[8%] top-[34%]">
        <div className="cloud-slow h-12 w-52 rounded-full bg-white shadow-[0_12px_30px_rgba(132,0,40,0.06)] after:absolute after:-top-6 after:left-12 after:h-14 after:w-20 after:rounded-full after:bg-white" />
      </div>

      <svg style={layer(6)} viewBox="0 0 1440 420" preserveAspectRatio="xMidYMax slice" className="absolute inset-x-0 bottom-0 h-[58%] w-full">
        {/* far hills */}
        <path d="M0 260 C 180 190, 360 230, 520 200 C 700 165, 860 220, 1040 190 C 1220 160, 1340 200, 1440 185 L1440 420 L0 420 Z" fill="#f3d9e0" />
        {/* Du Bois Library: tall slab with window stripes */}
        <g transform="translate(250 70)">
          <rect x="0" y="0" width="74" height="210" rx="3" fill="#e2afbd" />
          {Array.from({ length: 9 }).map((_, i) => <rect key={i} x={7 + i * 7} y="10" width="3" height="190" fill="#d496a8" />)}
          <rect x="-6" y="-6" width="86" height="10" rx="2" fill="#d496a8" />
        </g>
        {/* Old Chapel: bell tower with spire */}
        <g transform="translate(1040 110)">
          <rect x="0" y="40" width="44" height="130" fill="#e2afbd" />
          <path d="M-4 42 L22 -8 L48 42 Z" fill="#d496a8" />
          <rect x="14" y="60" width="16" height="24" rx="8" fill="#f3d9e0" />
          <rect x="44" y="100" width="90" height="70" fill="#e8bcc8" />
          <path d="M40 102 L89 70 L138 102 Z" fill="#dba0b1" />
        </g>
        {/* near hills */}
        <path d="M0 330 C 220 280, 420 320, 640 300 C 860 280, 1020 320, 1240 300 C 1340 292, 1400 300, 1440 296 L1440 420 L0 420 Z" fill="#e8bcc8" />
        {/* trees */}
        {[120, 170, 440, 520, 900, 960, 1300, 1360].map((x, i) => (
          <g key={x} transform={`translate(${x} ${300 + (i % 2) * 8})`}>
            <rect x="-3" y="10" width="6" height="22" fill="#c97d93" />
            <ellipse cx="0" cy="4" rx={18 + (i % 3) * 4} ry={22 + (i % 2) * 4} fill="#d58ea3" />
          </g>
        ))}
        {/* Campus Pond */}
        <ellipse cx="720" cy="372" rx="300" ry="26" fill="#f7e6eb" />
        <ellipse cx="660" cy="366" rx="90" ry="5" fill="#ffffff" opacity="0.7" />
      </svg>
    </div>
  );
}
