"use client";

import { usePathname } from "next/navigation";
import { Minuteman } from "./mascot/Minuteman";

// each section gets its own soft UMass-accent panel, like the landing page's feature tabs
const TINT: [string, string, string][] = [
  ["/todo", "#fbe9ee", "#6a0020"],
  ["/schedule", "#e8eef7", "#002554"],
  ["/opportunities", "#eef4ec", "#2f4a29"],
  ["/housing", "#fff6dc", "#6b4b00"],
  ["/updates", "#e3f4f7", "#00505c"],
  ["/courses", "#f0ecf7", "#3d2a6b"],
  ["/profile", "#f4f5f5", "#212721"],
  ["/search", "#f4f5f5", "#212721"],
  ["/map", "#eef4ec", "#2f4a29"],
];

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  const path = usePathname();
  const [, bg, ink] = TINT.find(([p]) => path.startsWith(p)) ?? ["", "#fbe9ee", "#6a0020"];
  return (
    <div className="relative mb-8 mt-10 rounded-[28px] px-6 pb-6 pt-7 sm:px-8" style={{ background: bg }}>
      <Minuteman size={84} className="absolute -top-[60px] right-5 sm:right-8" />
      <div className="flex flex-wrap items-end justify-between gap-4 pr-16 sm:pr-24">
        <div className="min-w-0">
          <h1 className="font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-[38px]" style={{ color: ink }}>{title}</h1>
          {subtitle && <p className="mt-2 max-w-[60ch] text-[15px] text-ink-soft">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="tablist" className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-full [scrollbar-width:none] bg-paper p-1.5">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={`whitespace-nowrap rounded-full px-4 py-2 text-[15px] font-semibold transition ${
            active === t.id ? "bg-ink text-white shadow" : "text-ink-muted hover:text-ink"
          }`}
        >
          {t.label}
          {t.count !== undefined && t.count > 0 && (
            <span className={`ml-1.5 text-xs tabular-nums ${active === t.id ? "text-white/70" : "text-ink-faint"}`}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
