"use client";

import Link from "next/link";
import type { Item, OfficeHourSlot } from "@/lib/api";
import type { Schedule } from "@/lib/store";
import { clock, dayKey, easternTime, easternWeekday } from "@/lib/time";
import { pageFor } from "./BriefText";

type Entry = {
  key: string;
  start: Date;
  end?: Date;
  kind: "class" | "due" | "meeting" | "office";
  title: string;
  detail?: string | null;
  href?: string;
};

export function todayEntries(items: Item[], schedule: Schedule, officeHours: OfficeHourSlot[], now = new Date()): Entry[] {
  const today = dayKey(now);
  const wd = easternWeekday(now);
  const out: Entry[] = [];
  for (const c of schedule?.classes ?? []) {
    if (!c.days.includes(wd) || !c.start) continue;
    out.push({ key: `c-${c.course}-${c.section}`, start: easternTime(today, c.start), end: c.end ? easternTime(today, c.end) : undefined,
      kind: "class", title: c.course, detail: [c.component, c.location].filter(Boolean).join(", "), href: `/courses/${encodeURIComponent(c.course)}` });
  }
  for (const i of Array.isArray(items) ? items : []) {
    const iso = i.due_at ?? i.starts_at;
    if (!iso || dayKey(new Date(iso)) !== today) continue;
    if (!["deadline", "appointment", "event", "reply_owed"].includes(i.category)) continue;
    out.push({ key: i.id, start: new Date(iso), kind: i.category === "deadline" || i.category === "reply_owed" ? "due" : "meeting",
      title: i.title, detail: i.course ?? i.location, href: `${pageFor(i)}?focus=${i.id}` });
  }
  for (const o of Array.isArray(officeHours) ? officeHours : []) {
    if (dayKey(new Date(o.starts_at)) !== today || o.can_make === false) continue;
    out.push({ key: `oh-${o.starts_at}-${o.who}`, start: new Date(o.starts_at), end: new Date(o.ends_at), kind: "office",
      title: `Office hours: ${o.who}`, detail: [o.course, o.location].filter(Boolean).join(", "), href: "/schedule" });
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

const MARK: Record<Entry["kind"], string> = {
  class: "h-3 w-3 rounded-sm bg-ink",
  due: "h-3 w-3 rotate-45 bg-maroon-600",
  meeting: "h-3 w-3 rounded-full bg-navy",
  office: "h-3 w-3 rounded-full border-2 border-forest bg-surface",
};

/** Today as one vertical line, with a maroon "now" marker between what's done and what's next. */
export function TodayLine({ entries, now = new Date() }: { entries: Entry[]; now?: Date }) {
  const nowIndex = entries.findIndex((e) => (e.end ?? e.start) > now);
  const cut = nowIndex === -1 ? entries.length : nowIndex;

  const row = (e: Entry, past: boolean) => (
    <li key={e.key} className={`relative grid grid-cols-[4.5rem_1fr] items-baseline gap-4 py-2 ${past ? "opacity-45" : ""}`}>
      <time className="text-right text-sm tabular-nums text-ink-muted">{clock(e.start)}</time>
      <div className="relative pl-6">
        <span className={`absolute left-[-6px] top-[7px] ${MARK[e.kind]}`} />
        {e.href ? (
          <Link href={e.href} className="font-semibold text-ink hover:text-maroon-700">{e.title}</Link>
        ) : (
          <span className="font-semibold text-ink">{e.title}</span>
        )}
        {e.detail && <span className="ml-2 text-sm text-ink-muted">{e.detail}</span>}
        {e.end && <span className="ml-2 text-sm text-ink-faint">until {clock(e.end)}</span>}
      </div>
    </li>
  );

  return (
    <ol className="relative">
      <span aria-hidden className="absolute bottom-3 left-[calc(4.5rem+1rem)] top-3 w-px bg-line" />
      {entries.slice(0, cut).map((e) => row(e, true))}
      <li className="relative grid grid-cols-[4.5rem_1fr] items-center gap-4 py-1.5" aria-label={`Now, ${clock(now)}`}>
        <span className="text-right text-sm font-bold text-maroon-600">Now</span>
        <span className="relative h-0.5 bg-maroon-600">
          <span className="absolute -left-[5px] -top-[4px] h-2.5 w-2.5 rounded-full bg-maroon-600" />
        </span>
      </li>
      {entries.slice(cut).map((e) => row(e, false))}
      {entries.slice(cut).length === 0 && (
        <li className="grid grid-cols-[4.5rem_1fr] gap-4 py-2">
          <span />
          <span className="pl-6 text-sm text-ink-muted">Nothing else scheduled today.</span>
        </li>
      )}
    </ol>
  );
}
