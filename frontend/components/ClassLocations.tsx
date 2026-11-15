"use client";

import Link from "next/link";
import { classWhereData, type ClassWhere } from "@/lib/features";
import { useResource } from "@/lib/useResource";
import { ResourceError } from "./ResourceError";

export function ClassLocations({ onPick, compact = false }: { onPick?: (to: string) => void; compact?: boolean }) {
  const where = useResource("/schedule/where", classWhereData);
  function directions(c: ClassWhere) {
    const nav = c.location.navigate;
    if (!nav) return null;
    return onPick ? <button onClick={() => onPick(nav.to)} className="text-sm font-semibold text-maroon-700 underline">{nav.label}</button> :
      <Link href={`/map?room=${encodeURIComponent(nav.to)}`} className="text-sm font-semibold text-maroon-700 underline">Directions ↗</Link>;
  }
  return <section className="rounded-[24px] border border-line-soft bg-white p-5">
    <h2 className="font-display text-lg font-extrabold">Where are my classes?</h2>
    {where.error && <div className="mt-3"><ResourceError message={where.error} retry={where.reload} /></div>}
    {!where.data && !where.error && <p role="status" className="mt-3 text-sm text-ink-muted">Finding your classrooms…</p>}
    {where.data?.classes.length === 0 && <p className="mt-3 text-sm text-ink-muted">Add your schedule to find your classrooms. <Link href="/schedule" className="font-semibold text-maroon-700 underline">Open Schedule</Link></p>}
    {compact ? <div className="mt-3 flex flex-wrap gap-2">{where.data?.classes.map((c, i) => c.location.navigate ? <button key={i} onClick={() => onPick?.(c.location.navigate!.to)} className="rounded-full border border-maroon-200 bg-maroon-50 px-3 py-2 text-xs font-semibold text-maroon-800">{c.course} · {c.location.room ?? c.location.building}</button> : <span key={i} className="text-xs text-ink-muted">{c.course}: {c.location.reason}</span>)}</div> :
      <ul className="mt-3 divide-y divide-line-soft">{where.data?.classes.map((c, i) => <li key={i} className="space-y-2 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{c.course} {c.component}{c.today && <span className="ml-2 text-xs text-maroon-600">Today</span>}</p><p className="mt-1 text-xs text-ink-muted">{c.day_names.join(", ")} · {c.start}–{c.end}</p></div>{directions(c)}</div>
        <p className="text-sm text-ink-soft">{c.location.found ? c.location.summary : c.location.reason ?? "Location unavailable"}</p>
        {c.walk_from_previous && <p className={`text-xs ${c.walk_from_previous.tight ? "font-semibold text-maroon-700" : "text-ink-muted"}`}>{c.walk_from_previous.same_building ? "Same building as" : `${c.walk_from_previous.minutes} min walk from`} {c.walk_from_previous.from} · {c.walk_from_previous.gap_minutes} min between classes on {c.walk_from_previous.day}{c.walk_from_previous.tight ? " · Tight connection" : ""}</p>}
      </li>)}</ul>}
  </section>;
}
