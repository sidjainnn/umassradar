"use client";

import { CalendarPlus, CalendarRange, ChevronLeft, ChevronRight, MapPin, Repeat, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImportDialog } from "@/components/ImportDialog";
import { Minuteman } from "@/components/mascot/Minuteman";
import { PageHeader } from "@/components/Page";
import { api } from "@/lib/api";
import { placeForRoom } from "@/lib/places";
import { parseQuickAdd, type QuickEvent } from "@/lib/quickadd";
import { useStore } from "@/lib/store";
import { useMode } from "@/lib/mode";

type Kind = "class" | "section" | "appointment" | "event" | "club" | "deadline" | "office_hours" | "google";
type Entry = {
  kind: Kind; id: string; title: string; subtitle?: string | null; start: string; end: string | null; all_day: boolean;
  location: string | null; course: string | null; href: string | null; editable: boolean; series_id?: string | null;
  can_make?: boolean | null; evidence?: string;
  mode?: "study" | "work" | "both";
};
type Week = { start: string; calendar_connected: boolean; entries: Entry[] };

const KIND: Record<Kind, { label: string; block: string; dot: string }> = {
  class: { label: "Class", block: "bg-maroon-600 text-white", dot: "#840028" },
  section: { label: "Lab or discussion", block: "bg-maroon-100 text-maroon-800", dot: "#ebb5c4" },
  appointment: { label: "Appointment", block: "bg-navy text-white", dot: "#002554" },
  event: { label: "Event", block: "bg-[#dbe6f5] text-navy", dot: "#7d9cc9" },
  club: { label: "Club event", block: "bg-[#d9f3f7] text-[#00505c]", dot: "#00aec7" },
  deadline: { label: "Due", block: "bg-gold/90 text-ink", dot: "#ffc72c" },
  office_hours: { label: "Office hours", block: "border-2 border-dashed border-forest bg-[#eef4ec] text-[#2f4a29]", dot: "#44693d" },
  google: { label: "Google Calendar", block: "bg-[#eceeee] text-ink-soft", dot: "#a2aaad" },
};

const DAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_PX = 54;

// ---------- date helpers (local time; the app is used in Amherst) ----------
const mondayOf = (d: Date) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const sameDay = (a: Date, b: Date) => ymd(a) === ymd(b);
const dayIndex = (d: Date) => (d.getDay() + 6) % 7;
const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();
const timeLabel = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: d.getMinutes() ? "2-digit" : undefined });
const dateLabel = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const titleCase = (s: string) => (s === s.toLowerCase() ? s.replace(/\b\w/g, (c) => c.toUpperCase()) : s);

function rangeLabel(e: { start: Date; end: Date | null; allDay: boolean }) {
  if (e.allDay) return `${dateLabel(e.start)}, all day`;
  return `${dateLabel(e.start)}, ${timeLabel(e.start)}${e.end ? ` to ${timeLabel(e.end)}` : ""}`;
}

function matches(e: Entry, q: string) {
  const s = q.toLowerCase();
  return [e.title, e.subtitle, e.location, e.course].some((v) => v?.toLowerCase().includes(s));
}

/** Side-by-side lanes for overlapping blocks in one day column. */
const RANK: Record<Kind, number> = { class: 0, section: 1, appointment: 2, office_hours: 3, google: 4, club: 5, event: 6, deadline: 7 };

/**
 * Lay out one day's timed events. Events only share width with events they overlap, at most two side by side;
 * when more overlap, the most important ones show (classes, then your appointments, Google, then email events)
 * and the rest are listed in a small "+N" button.
 */
function lanes(entries: Entry[]) {
  const endOf = (e: Entry) => +new Date(e.end ?? e.start) || +new Date(e.start) + 3_600_000;
  const sorted = [...entries].sort((a, b) => +new Date(a.start) - +new Date(b.start));
  // group into clusters of overlapping events
  const clusters: Entry[][] = [];
  let end = -Infinity;
  for (const e of sorted) {
    if (+new Date(e.start) >= end) clusters.push([]);
    clusters[clusters.length - 1].push(e);
    end = Math.max(end, endOf(e));
  }
  const shown: { e: Entry; lane: number; lanes: number }[] = [];
  const more: { at: Entry; hidden: Entry[] }[] = [];
  for (const c of clusters) {
    const byRank = [...c].sort((a, b) => (RANK[a.kind] - RANK[b.kind]) || (+new Date(a.start) - +new Date(b.start)));
    const placed: { e: Entry; lane: number }[] = [];
    const hidden: Entry[] = [];
    for (const e of byRank) {
      const s = +new Date(e.start), en = endOf(e);
      const lane = [0, 1].find((l) => !placed.some((p) => p.lane === l && +new Date(p.e.start) < en && endOf(p.e) > s));
      if (lane === undefined) { hidden.push(e); continue; }
      placed.push({ e, lane });
    }
    const n = placed.some((p) => p.lane === 1) ? 2 : 1;
    placed.forEach((p) => shown.push({ ...p, lanes: n }));
    if (hidden.length) more.push({ at: hidden.reduce((a, b) => (+new Date(a.start) <= +new Date(b.start) ? a : b)), hidden });
  }
  return { shown, more };
}

// ---------- command bar ----------
function CommandBar({ query, setQuery, parsed, onAdd, adding, results, onPick }: {
  query: string; setQuery: (q: string) => void; parsed: QuickEvent | null; onAdd: () => void; adding: boolean;
  results: Entry[]; onPick: (e: Entry) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "n" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName ?? "")) { e.preventDefault(); ref.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative">
      <div className="flex items-center gap-3 rounded-[22px] border border-line-soft bg-white px-4 py-3 shadow-[0_24px_50px_-30px_rgba(60,0,20,0.45)] focus-within:ring-2 focus-within:ring-maroon-200">
        {parsed ? <CalendarPlus className="h-5 w-5 shrink-0 text-maroon-600" /> : <Search className="h-5 w-5 shrink-0 text-ink-faint" />}
        <input
          ref={ref}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && parsed) { e.preventDefault(); onAdd(); }
            if (e.key === "Escape") setQuery("");
          }}
          placeholder="Add or search: “Study group Thu 7pm at Du Bois”"
          aria-label="Add an event or search your schedule"
          className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-faint focus-visible:outline-none"
        />
        {query && <button onClick={() => setQuery("")} aria-label="Clear" className="text-ink-faint hover:text-ink"><X className="h-4 w-4" /></button>}
        <kbd className="hidden rounded-md border border-line px-1.5 text-[11px] text-ink-faint sm:block">N</kbd>
      </div>

      {parsed && (
        <div className="rise mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[20px] bg-maroon-50 px-4 py-3 ring-1 ring-maroon-100">
          <div className="min-w-0 flex-1">
            <p className="font-display text-[17px] font-extrabold tracking-[-0.02em] text-ink">{parsed.title}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
              <span>{rangeLabel(parsed)}</span>
              {parsed.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{titleCase(parsed.location)}</span>}
              {parsed.repeatDays.length > 0 && (
                <span className="inline-flex items-center gap-1"><Repeat className="h-3.5 w-3.5" />
                  Every {parsed.repeatDays.map((d) => DAY[d]).join(", ")}{parsed.repeatUntil ? ` until ${dateLabel(parsed.repeatUntil)}` : " for 12 weeks"}
                </span>
              )}
              {parsed.course && <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-maroon-700 ring-1 ring-maroon-100">{parsed.course}</span>}
            </p>
          </div>
          <button onClick={onAdd} disabled={adding}
            className="rounded-full bg-maroon-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_20px_-12px_rgba(132,0,40,0.8)] hover:bg-maroon-700 disabled:opacity-50">
            {adding ? "Adding…" : "Add  ↵"}
          </button>
        </div>
      )}

      {!parsed && query.trim().length > 1 && (
        <div className="mt-2 overflow-hidden rounded-[20px] border border-line-soft bg-white">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-muted">Nothing matches “{query.trim()}”. Add a day or time to create it, like “{query.trim()} tomorrow 4pm”.</p>
          ) : (
            <ul className="max-h-72 divide-y divide-line-soft overflow-y-auto">
              {results.slice(0, 8).map((e) => (
                <li key={e.id}>
                  <button onClick={() => onPick(e)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-paper">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: KIND[e.kind].dot }} />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{e.title}</span>
                    <span className="shrink-0 text-sm text-ink-muted">{dateLabel(new Date(e.start))}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- mini month ----------
function MiniMonth({ weekStart, onPick }: { weekStart: Date; onPick: (d: Date) => void }) {
  const [month, setMonth] = useState(() => new Date(weekStart.getFullYear(), weekStart.getMonth(), 1));
  useEffect(() => { setMonth(new Date(weekStart.getFullYear(), weekStart.getMonth(), 1)); }, [weekStart]);
  const first = mondayOf(month);
  const today = new Date();
  const weekEnd = addDays(weekStart, 7);
  return (
    <div className="rounded-[22px] bg-white p-4 ring-1 ring-line-soft">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-display text-[15px] font-extrabold tracking-[-0.02em]">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
        <div className="flex gap-1">
          <button aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-full p-1 hover:bg-paper"><ChevronLeft className="h-4 w-4" /></button>
          <button aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-full p-1 hover:bg-paper"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] text-ink-faint">{DAY.map((d) => <span key={d}>{d[0]}</span>)}</div>
      <div className="mt-1 grid grid-cols-7 gap-y-0.5 text-center text-[13px]">
        {Array.from({ length: 42 }).map((_, i) => {
          const d = addDays(first, i);
          const inWeek = d >= weekStart && d < weekEnd;
          const isToday = sameDay(d, today);
          return (
            <button key={i} onClick={() => onPick(d)}
              className={`mx-auto grid h-7 w-7 place-items-center rounded-full tabular-nums ${isToday ? "bg-maroon-600 font-bold text-white" : inWeek ? "bg-maroon-50 font-semibold text-maroon-700" : d.getMonth() === month.getMonth() ? "text-ink-soft hover:bg-paper" : "text-ink-faint/60 hover:bg-paper"}`}>
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- week grid ----------
function WeekGrid({ weekStart, entries, query, onOpen }: { weekStart: Date; entries: Entry[]; query: string; onOpen: (e: Entry) => void }) {
  const mode = useMode();
  const timed = entries.filter((e) => !e.all_day && e.kind !== "deadline");
  const allDay = entries.filter((e) => e.all_day || e.kind === "deadline");
  const days = entries.some((e) => dayIndex(new Date(e.start)) >= 5) ? 7 : 5;
  const startHour = Math.min(8, ...timed.map((e) => new Date(e.start).getHours()));
  const endHour = Math.max(18, ...timed.map((e) => Math.ceil(minutesOf(new Date(e.end ?? e.start)) / 60)));
  const now = new Date();
  const dim = (e: Entry) => query.trim().length > 1 ? (matches(e, query.trim()) ? "ring-2 ring-gold ring-offset-1" : "opacity-25") : e.mode && e.mode !== "both" && e.mode !== mode ? "opacity-40" : "";

  return (
    <div className="overflow-x-auto rounded-[24px] border border-line-soft bg-white shadow-[0_24px_50px_-34px_rgba(60,0,20,0.45)]">
      <div className="grid min-w-[640px]" style={{ gridTemplateColumns: `3.25rem repeat(${days}, minmax(0, 1fr))` }}>
        <div className="border-b border-line-soft" />
        {Array.from({ length: days }).map((_, i) => {
          const d = addDays(weekStart, i);
          const isToday = sameDay(d, now);
          return (
            <div key={i} className="border-b border-l border-line-soft px-2 pb-1.5 pt-2 text-center">
              <p className={`text-[12px] ${isToday ? "font-bold text-maroon-600" : "text-ink-muted"}`}>{DAY[i]}</p>
              <p className={`mx-auto mt-0.5 grid h-8 w-8 place-items-center rounded-full font-display text-[17px] font-extrabold ${isToday ? "bg-maroon-600 text-white" : "text-ink"}`}>{d.getDate()}</p>
              <div className="mt-1 space-y-1">
                {(() => {
                  const today = allDay.filter((e) => sameDay(new Date(e.start), d));
                  const shown = today.slice(0, 2); // keep the top row short; the rest open from "+ more"
                  return (
                    <>
                      {shown.map((e) => (
                        <button key={e.id} onClick={() => onOpen(e)} title={`${e.kind === "deadline" ? `Due ${timeLabel(new Date(e.start))}: ` : ""}${e.title}`}
                          className={`block w-full truncate rounded-full px-2 py-0.5 text-left text-[11.5px] font-semibold ${KIND[e.kind].block} ${dim(e)}`}>
                          {e.title}
                        </button>
                      ))}
                      {today.length > 2 && (
                        <button onClick={() => onOpen(today[2])} title={today.slice(2).map((e) => e.title).join("\n")}
                          className="block w-full rounded-full px-2 py-0.5 text-left text-[11.5px] font-semibold text-ink-muted hover:bg-paper">
                          + {today.length - 2} more
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          );
        })}
        <div className="relative" style={{ height: (endHour - startHour) * HOUR_PX }}>
          {Array.from({ length: endHour - startHour }).map((_, h) => (
            <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-ink-faint" style={{ top: h * HOUR_PX }}>
              {h ? timeLabel(new Date(2000, 0, 1, startHour + h)) : ""}
            </span>
          ))}
        </div>
        {Array.from({ length: days }).map((_, i) => {
          const d = addDays(weekStart, i);
          const col = lanes(timed.filter((e) => sameDay(new Date(e.start), d)));
          const nowTop = ((minutesOf(now) - startHour * 60) / 60) * HOUR_PX;
          return (
            <div key={i} className={`relative border-l border-line-soft ${sameDay(d, now) ? "bg-maroon-50/40" : ""}`} style={{ height: (endHour - startHour) * HOUR_PX }}>
              {Array.from({ length: endHour - startHour }).map((_, h) => (
                <span key={h} className="absolute inset-x-0 border-t border-line-soft" style={{ top: h * HOUR_PX }} />
              ))}
              {sameDay(d, now) && nowTop > 0 && nowTop < (endHour - startHour) * HOUR_PX && (
                <span className="absolute inset-x-0 z-20 h-0.5 bg-maroon-600" style={{ top: nowTop }}>
                  <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-maroon-600" />
                </span>
              )}
              {col.shown.map(({ e, lane, lanes: n }) => {
                const s = new Date(e.start), en = new Date(e.end ?? +s + 3_600_000);
                const top = ((minutesOf(s) - startHour * 60) / 60) * HOUR_PX;
                const height = Math.max(((+en - +s) / 3_600_000) * HOUR_PX - 2, 22);
                return (
                  <button key={e.id} onClick={() => onOpen(e)}
                    className={`absolute overflow-hidden rounded-xl px-2 py-1 text-left text-[12px] leading-tight transition hover:z-30 hover:shadow-lg ${KIND[e.kind].block} ${e.kind === "office_hours" && e.can_make === false ? "line-through opacity-60" : ""} ${dim(e)}`}
                    style={{ top, height, left: `calc(${(lane / n) * 100}% + 3px)`, width: `calc(${100 / n}% - 6px)` }}>
                    <span className="block truncate font-semibold">{e.title}</span>
                    {height > 38 && <span className="block truncate opacity-85">{[e.subtitle, e.location].filter(Boolean).join(", ")}</span>}
                  </button>
                );
              })}
              {col.more.map(({ at, hidden }) => (
                <button key={`more-${at.id}`} onClick={() => onOpen(hidden[0])} title={hidden.map((h) => h.title).join("\n")}
                  className="absolute right-1 z-20 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-soft shadow ring-1 ring-line hover:bg-paper"
                  style={{ top: ((minutesOf(new Date(at.start)) - startHour * 60) / 60) * HOUR_PX - 9 }}>
                  +{hidden.length}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- phone: day strip + agenda ----------
function DayAgenda({ weekStart, entries, day, setDay, query, onOpen }: {
  weekStart: Date; entries: Entry[]; day: number; setDay: (d: number) => void; query: string; onOpen: (e: Entry) => void;
}) {
  const mode = useMode();
  const d = addDays(weekStart, day);
  const list = entries.filter((e) => sameDay(new Date(e.start), d) && (query.trim().length < 2 || matches(e, query.trim())));
  return (
    <div>
      <div className="grid grid-cols-7 gap-1">
        {DAY.map((name, i) => {
          const date = addDays(weekStart, i);
          const has = entries.some((e) => sameDay(new Date(e.start), date));
          return (
            <button key={name} onClick={() => setDay(i)}
              className={`rounded-2xl py-2 text-center ${day === i ? "bg-maroon-600 text-white shadow" : "bg-white text-ink-soft ring-1 ring-line-soft"}`}>
              <span className="block text-[11px]">{name}</span>
              <span className="block font-display text-[17px] font-extrabold">{date.getDate()}</span>
              <span className={`mx-auto mt-0.5 block h-1 w-1 rounded-full ${has ? (day === i ? "bg-white" : "bg-maroon-600") : "bg-transparent"}`} />
            </button>
          );
        })}
      </div>
      <ul className="mt-4 space-y-2">
        {list.length === 0 && <li className="rounded-[20px] bg-white px-4 py-6 text-center text-sm text-ink-muted ring-1 ring-line-soft">Nothing on {dateLabel(d)}. Type above to add something.</li>}
        {list.map((e) => (
          <li key={e.id} className={e.mode && e.mode !== "both" && e.mode !== mode ? "opacity-40" : ""}>
            <button onClick={() => onOpen(e)} className="flex w-full items-stretch gap-3 rounded-[20px] bg-white p-3 text-left ring-1 ring-line-soft">
              <span className="w-1.5 shrink-0 rounded-full" style={{ background: KIND[e.kind].dot }} />
              <span className="w-16 shrink-0 text-sm tabular-nums text-ink-muted">{e.all_day ? "All day" : timeLabel(new Date(e.start))}</span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate font-semibold text-ink ${e.kind === "office_hours" && e.can_make === false ? "line-through opacity-60" : ""}`}>{e.title}</span>
                <span className="block truncate text-sm text-ink-muted">{[KIND[e.kind].label, e.location].filter(Boolean).join(" · ")}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- details sheet ----------
function Details({ entry, onClose, onChanged }: { entry: Entry; onClose: () => void; onChanged: (msg: string) => void }) {
  const [title, setTitle] = useState(entry.title);
  const [location, setLocation] = useState(entry.location ?? "");
  const [busy, setBusy] = useState(false);
  const s = new Date(entry.start), en = entry.end ? new Date(entry.end) : null;

  async function save() {
    setBusy(true);
    await api(`/events/${entry.id}`, { method: "PATCH", body: JSON.stringify({ title, location: location || null }) }).catch(() => {});
    onChanged("Event updated.");
  }
  async function remove(series: boolean) {
    setBusy(true);
    await api(`/events/${entry.id}?series=${series}`, { method: "DELETE" }).catch(() => {});
    onChanged(series ? "Deleted every repeat." : "Event deleted.");
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/25 p-3 sm:place-items-center" onClick={onClose}>
      <div role="dialog" aria-label={entry.title} onClick={(e) => e.stopPropagation()} className="rise w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: `${KIND[entry.kind].dot}22`, color: "#212721" }}>{KIND[entry.kind].label}</span>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 text-ink-muted hover:bg-paper"><X className="h-4 w-4" /></button>
        </div>
        {entry.editable ? (
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-3 w-full rounded-xl px-2 py-1 font-display text-[22px] font-extrabold tracking-[-0.02em] outline-none ring-1 ring-transparent focus:ring-line" />
        ) : (
          <h2 className="mt-3 font-display text-[22px] font-extrabold tracking-[-0.02em]">{entry.title}</h2>
        )}
        <p className="mt-1 text-[15px] text-ink-soft">{entry.kind === "deadline" ? `Due ${dateLabel(s)}, ${timeLabel(s)}` : rangeLabel({ start: s, end: en, allDay: entry.all_day })}</p>
        {entry.editable ? (
          <label className="mt-3 flex items-center gap-2 rounded-xl px-2 py-1 ring-1 ring-line"><MapPin className="h-4 w-4 text-ink-faint" />
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Add a place" className="flex-1 bg-transparent py-1 text-[15px] outline-none" />
          </label>
        ) : entry.location && <p className="mt-2 flex items-center gap-1.5 text-[15px] text-ink-soft"><MapPin className="h-4 w-4" />{entry.location}</p>}
        {entry.kind === "office_hours" && entry.can_make !== undefined && entry.can_make !== null && (
          <p className={`mt-2 text-sm font-semibold ${entry.can_make ? "text-forest" : "text-ink-muted"}`}>{entry.can_make ? "You're free for this." : "This clashes with something else on your schedule."}</p>
        )}
        {entry.evidence && <p className="mt-3 font-serif italic leading-relaxed text-ink-soft">“{entry.evidence}”</p>}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {entry.location && placeForRoom(entry.location) && (
            <Link href={`/map?room=${encodeURIComponent(entry.location)}`} className="rounded-full bg-maroon-50 px-3 py-1.5 text-sm font-semibold text-maroon-700 hover:bg-maroon-100">Find this room</Link>
          )}
          {entry.course && <Link href={`/courses/${encodeURIComponent(entry.course)}`} className="rounded-full bg-paper px-3 py-1.5 text-sm font-semibold text-ink hover:bg-line-soft">{entry.course}</Link>}
          {entry.href && !entry.href.startsWith("/courses") && <a href={entry.href} target="_blank" rel="noreferrer" className="rounded-full bg-paper px-3 py-1.5 text-sm font-semibold text-ink hover:bg-line-soft">Open source</a>}
          {entry.editable && (
            <>
              <button onClick={() => remove(false)} disabled={busy} className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-maroon-700 hover:bg-maroon-50"><Trash2 className="h-4 w-4" />Delete</button>
              {entry.series_id && <button onClick={() => remove(true)} disabled={busy} className="rounded-full px-3 py-1.5 text-sm font-semibold text-maroon-700 hover:bg-maroon-50">Delete all repeats</button>}
              <button onClick={save} disabled={busy || (title === entry.title && location === (entry.location ?? ""))} className="rounded-full bg-maroon-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40">Save</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- page ----------
export default function SchedulePage() {
  const { me, schedule, items, setNotice, reload } = useStore();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [week, setWeek] = useState<Week | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Entry | null>(null);
  const [adding, setAdding] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [day, setDay] = useState(() => dayIndex(new Date()));

  const load = useCallback(async () => {
    setWeek(await api<Week>(`/schedule/week?start=${ymd(weekStart)}`).catch(() => ({ start: ymd(weekStart), calendar_connected: false, entries: [] })));
  }, [weekStart]);
  useEffect(() => { load(); }, [load]);

  const known = useMemo(() => [...new Set((schedule?.classes ?? []).map((c) => c.course))], [schedule]);
  const parsed = useMemo(() => parseQuickAdd(query, new Date(), known), [query, known]);
  const entries = useMemo(() => week?.entries ?? [], [week]);

  // search covers this week plus everything else OneMass knows about
  const results = useMemo(() => {
    const q = query.trim();
    if (parsed || q.length < 2) return [];
    const fromItems: Entry[] = (items ?? []).filter((i) => (i.due_at ?? i.starts_at)).map((i) => ({
      kind: i.category === "deadline" ? "deadline" : i.source === "campus" ? "club" : i.category === "appointment" ? "appointment" : "event",
      id: i.id, title: i.title, subtitle: i.sender, start: (i.due_at ?? i.starts_at)!, end: null, all_day: false,
      location: i.location, course: i.course, href: i.url, editable: false, evidence: i.evidence,
    }));
    const seen = new Set<string>();
    return [...entries, ...fromItems].filter((e) => matches(e, q) && !seen.has(e.id) && seen.add(e.id))
      .sort((a, b) => Math.abs(+new Date(a.start) - Date.now()) - Math.abs(+new Date(b.start) - Date.now()));
  }, [query, parsed, entries, items]);

  async function add() {
    if (!parsed) return;
    setAdding(true);
    const days = parsed.repeatDays.length ? parsed.repeatDays : [null];
    const until = parsed.repeatUntil ?? (parsed.repeatDays.length ? addDays(parsed.start, 7 * 12) : null);
    try {
      for (const d of days) {
        const shift = d === null ? 0 : (d - dayIndex(parsed.start) + 7) % 7;
        const start = addDays(parsed.start, shift);
        const end = parsed.end ? new Date(+parsed.end + (+start - +parsed.start)) : null;
        await api("/events", {
          method: "POST",
          body: JSON.stringify({
            title: parsed.title, starts_at: start.toISOString(), ends_at: end?.toISOString() ?? null,
            location: parsed.location ? titleCase(parsed.location) : null, course: parsed.course,
            kind: parsed.allDay ? "event" : "appointment", repeat_until: until ? ymd(until) : null,
          }),
        });
      }
      setNotice(`Added “${parsed.title}” on ${dateLabel(parsed.start)}.`);
      setQuery("");
      setWeekStart(mondayOf(parsed.start));
      setDay(dayIndex(parsed.start));
      await load();
      reload();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Couldn't add that event.");
    } finally {
      setAdding(false);
    }
  }

  function jumpTo(e: Entry) {
    const d = new Date(e.start);
    setWeekStart(mondayOf(d));
    setDay(dayIndex(d));
    setOpen(e);
  }

  const upcoming = entries.filter((e) => +new Date(e.end ?? e.start) >= Date.now()).slice(0, 10);
  const weekEnd = addDays(weekStart, 6);
  const label = `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} to ${weekEnd.toLocaleDateString("en-US", { month: weekEnd.getMonth() === weekStart.getMonth() ? undefined : "short", day: "numeric" })}`;

  return (
    <div className="pb-16">
      <PageHeader
        title="Schedule"
        subtitle="Classes, meetings, office hours, club events and deadlines in one week. Type below to add something or find it."
        action={!me.demo ? (
          <div className="flex gap-4 text-sm font-semibold">
            <button onClick={() => setUploading(true)} className="text-maroon-700 hover:underline">{schedule ? "Replace classes" : "Upload classes"}</button>
          </div>
        ) : undefined}
      />

      <CommandBar query={query} setQuery={setQuery} parsed={parsed} onAdd={add} adding={adding} results={results} onPick={jumpTo} />

      {!schedule && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[20px] bg-white px-4 py-3 ring-1 ring-line-soft">
          <CalendarRange className="h-5 w-5 text-maroon-600" />
          <p className="flex-1 text-sm text-ink-soft">Add your classes from a SPIRE or College Scheduler screenshot, or SPIRE&apos;s calendar export (.ics).</p>
          <button onClick={() => setUploading(true)} disabled={me.demo} className="rounded-full bg-maroon-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40">Upload schedule</button>
        </div>
      )}

      <div className="mt-6 flex items-center gap-2">
        <button onClick={() => { setWeekStart(mondayOf(new Date())); setDay(dayIndex(new Date())); }} className="rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold ring-1 ring-line hover:bg-paper">Today</button>
        <button aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))} className="grid h-8 w-8 place-items-center rounded-full bg-white ring-1 ring-line hover:bg-paper"><ChevronLeft className="h-4 w-4" /></button>
        <button aria-label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))} className="grid h-8 w-8 place-items-center rounded-full bg-white ring-1 ring-line hover:bg-paper"><ChevronRight className="h-4 w-4" /></button>
        <h2 className="ml-2 font-display text-[20px] font-extrabold tracking-[-0.03em]">{label}</h2>
        <div className="ml-auto hidden flex-wrap gap-3 text-[12px] text-ink-muted xl:flex">
          {(["class", "appointment", "club", "office_hours", "deadline", ...(week?.calendar_connected ? ["google"] : [])] as Kind[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: KIND[k].dot }} />{KIND[k].label}</span>
          ))}
        </div>
      </div>

      <div className="mt-4 hidden gap-5 lg:grid xl:grid-cols-[250px_1fr]">
        {/* the month and "Coming up" panel only on wide screens, so the week grid gets the room */}
        <aside className="hidden space-y-4 xl:block">
          <MiniMonth weekStart={weekStart} onPick={(d) => { setWeekStart(mondayOf(d)); setDay(dayIndex(d)); }} />
          <div className="rounded-[22px] bg-white p-4 ring-1 ring-line-soft">
            <p className="font-display text-[15px] font-extrabold tracking-[-0.02em]">Coming up</p>
            {upcoming.length === 0 ? (
              <div className="mt-2 flex items-center gap-2 text-sm text-ink-muted"><Minuteman size={40} watch={false} />A quiet week.</div>
            ) : (
              <ul className="mt-2 space-y-2.5">
                {upcoming.map((e) => (
                  <li key={e.id}>
                    <button onClick={() => setOpen(e)} className="flex w-full items-start gap-2 text-left">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: KIND[e.kind].dot }} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">{e.title}</span>
                        <span className="block text-[12px] text-ink-muted">{dateLabel(new Date(e.start))}{e.all_day ? "" : `, ${timeLabel(new Date(e.start))}`}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
        <WeekGrid weekStart={weekStart} entries={entries} query={parsed ? "" : query} onOpen={setOpen} />
      </div>

      <div className="mt-4 lg:hidden">
        <DayAgenda weekStart={weekStart} entries={entries} day={day} setDay={setDay} query={parsed ? "" : query} onOpen={setOpen} />
      </div>

      {open && <Details entry={open} onClose={() => setOpen(null)} onChanged={(m) => { setOpen(null); setNotice(m); load(); reload(); }} />}
      {uploading && <ImportDialog only="schedule" onClose={() => setUploading(false)} onImported={(m) => { setNotice(m); reload(); load(); }} />}
    </div>
  );
}
