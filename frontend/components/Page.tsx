export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-[30px] font-semibold leading-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 max-w-[60ch] text-[15px] text-ink-muted">{subtitle}</p>}
      </div>
      {action}
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
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[15px] ${
            active === t.id ? "border-maroon-600 font-semibold text-ink" : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          {t.label}
          {t.count !== undefined && t.count > 0 && <span className="ml-1.5 text-xs tabular-nums text-ink-faint">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
