import type { LucideIcon } from "lucide-react";

/** The glossy 3D icon blob from the landing page's card fan, for tiles and empty states. */
export function GlossyIcon({ icon: Icon, from, to, size = 44 }: { icon: LucideIcon; from: string; to: string; size?: number }) {
  return (
    <span
      className="relative inline-grid shrink-0 place-items-center text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.45),0_12px_20px_-10px_rgba(60,0,20,0.6)]"
      style={{ width: size, height: size, borderRadius: size * 0.36, background: `linear-gradient(160deg, ${from}, ${to})` }}
    >
      <Icon style={{ width: size * 0.5, height: size * 0.5 }} className="drop-shadow-[0_3px_3px_rgba(0,0,0,0.25)]" strokeWidth={2.2} />
      <span className="absolute rounded-full bg-white/45 blur-[1px]" style={{ left: size * 0.16, top: size * 0.1, width: size * 0.3, height: size * 0.14 }} />
    </span>
  );
}
