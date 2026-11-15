import { Minuteman } from "./Minuteman";

/** Sam with a short line, for empty states and small celebrations. */
export function SamSays({ children, size = 56, cheer = false }: { children: React.ReactNode; size?: number; cheer?: boolean }) {
  return (
    <div className="flex items-center gap-4 rounded-[22px] bg-[linear-gradient(160deg,#fbeef2,#ffffff)] px-5 py-4 ring-1 ring-maroon-100">
      <Minuteman size={size} greet={cheer} className="-my-2 shrink-0" />
      <div className="text-[15px] leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}
