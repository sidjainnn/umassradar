"use client";

import { CalendarRange } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ImportDialog } from "@/components/ImportDialog";
import { ItemList } from "@/components/ItemRow";
import { PageHeader } from "@/components/Page";
import { WeekAgenda } from "@/components/WeekAgenda";
import { api } from "@/lib/api";
import { whenOf } from "@/lib/sections";
import { type ScheduleClass, useStore } from "@/lib/store";
import { clock, daysBetween, easternWeekday, formatWhen } from "@/lib/time";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_PX = 52;

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function label(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "a" : "p"}`;
}

function WeekGrid({ classes }: { classes: ScheduleClass[] }) {
  const days = classes.some((c) => c.days.some((d) => d >= 5)) ? 7 : 5;
  const first = Math.min(8 * 60, ...classes.map((c) => minutes(c.start)));
  const last = Math.max(17 * 60, ...classes.map((c) => minutes(c.end)));
  const startHour = Math.floor(first / 60);
  const endHour = Math.ceil(last / 60);
  const today = easternWeekday();
  const nowMin = (() => {
    const p = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date());
    return Number(p.find((x) => x.type === "hour")?.value) * 60 + Number(p.find((x) => x.type === "minute")?.value);
  })();

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <div className="grid min-w-[620px]" style={{ gridTemplateColumns: `3.25rem repeat(${days}, 1fr)` }}>
        <div className="border-b border-line" />
        {DAYS.slice(0, days).map((d, i) => (
          <div key={d} className={`border-b border-l border-line px-2 py-2 text-center text-sm ${i === today ? "font-bold text-maroon-600" : "text-ink-soft"}`}>{d}</div>
        ))}
        <div className="relative" style={{ height: (endHour - startHour) * HOUR_PX }}>
          {Array.from({ length: endHour - startHour }).map((_, h) => (
            <span key={h} className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-ink-faint" style={{ top: h * HOUR_PX }}>
              {h ? label(`${startHour + h}:00`) : ""}
            </span>
          ))}
        </div>
        {DAYS.slice(0, days).map((d, day) => (
          <div key={d} className="relative border-l border-line" style={{ height: (endHour - startHour) * HOUR_PX }}>
            {Array.from({ length: endHour - startHour }).map((_, h) => (
              <span key={h} className="absolute inset-x-0 border-t border-line-soft" style={{ top: h * HOUR_PX }} />
            ))}
            {day === today && nowMin > startHour * 60 && nowMin < endHour * 60 && (
              <span className="absolute inset-x-0 z-10 h-0.5 bg-maroon-600" style={{ top: ((nowMin - startHour * 60) / 60) * HOUR_PX }} />
            )}
            {classes.filter((c) => c.days.includes(day)).map((c) => {
              const top = ((minutes(c.start) - startHour * 60) / 60) * HOUR_PX;
              const height = ((minutes(c.end) - minutes(c.start)) / 60) * HOUR_PX;
              return (
                <Link key={`${c.course}-${c.start}-${c.component}`} href={`/courses/${encodeURIComponent(c.course)}`}
                  className={`absolute inset-x-1 overflow-hidden rounded-md px-2 py-1 text-[12px] leading-tight hover:ring-2 hover:ring-maroon-200 ${
                    c.component === "LEC" || !c.component ? "bg-maroon-600 text-white" : "bg-maroon-100 text-maroon-800"
                  }`}
                  style={{ top, height: Math.max(height, 22) }}>
                  <span className="block font-semibold">{c.course}</span>
                  {height > 36 && <span className="block opacity-85">{[c.component, c.location].filter(Boolean).join(", ")}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SchedulePage() {
  const { me, schedule, items, officeHours, setStatus, setNotice, reload } = useStore();
  const [adding, setAdding] = useState(false);
  const now = new Date();

  const thisWeek = useMemo(
    () => (items ?? [])
      .filter((i) => ["appointment", "event"].includes(i.category))
      .filter((i) => { const w = whenOf(i); return !!w && w > now && daysBetween(now, w) <= 7; })
      .sort((a, b) => whenOf(a)!.getTime() - whenOf(b)!.getTime()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items],
  );

  async function removeSchedule() {
    if (!confirm("Remove your class schedule from UMass Radar?")) return;
    await api("/schedule", { method: "DELETE" });
    reload();
  }

  return (
    <div className="space-y-10 pb-16">
      <PageHeader
        title="Schedule"
        subtitle={schedule ? `Your classes${schedule.term ? ` for ${schedule.term}` : ""}, with office hours and appointments for the week.` : "Your week: classes, office hours and appointments."}
        action={schedule && !me.demo ? (
          <div className="flex gap-4 text-sm font-semibold">
            <button onClick={() => setAdding(true)} className="text-maroon-600 hover:underline">Replace schedule</button>
            <button onClick={removeSchedule} className="text-ink-muted hover:text-ink">Remove</button>
          </div>
        ) : undefined}
      />

      <WeekAgenda />

      {schedule ? (
        <details className="rounded-xl border border-line bg-white p-4"><summary className="cursor-pointer text-sm font-semibold">Class timetable</summary><div className="mt-4"><WeekGrid classes={schedule.classes} /></div></details>
      ) : (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-8">
          <CalendarRange className="h-6 w-6 text-maroon-600" />
          <h2 className="mt-3 font-serif text-lg font-semibold">Add your class schedule</h2>
          <p className="mt-1 max-w-[60ch] text-[15px] text-ink-muted">
            Take a screenshot of your weekly schedule in SPIRE or College Scheduler (Current Schedule), or download SPIRE&apos;s
            calendar export (.ics). Your classes show up on Home, office hours are checked against them, and your courses
            get their own pages.
          </p>
          <button onClick={() => setAdding(true)} disabled={me.demo}
            className="mt-4 rounded-lg bg-maroon-600 px-4 py-2 text-sm font-semibold text-white hover:bg-maroon-700 disabled:opacity-40">
            Upload schedule
          </button>
          <p className="mt-3 text-[13px] text-ink-muted">UMass doesn&apos;t offer a SPIRE API for students, so a screenshot or the calendar export is the quickest way in.</p>
        </div>
      )}

      {officeHours.length > 0 && (
        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-ink-soft">Office hours this week</h2>
          <ul className="divide-y divide-line-soft rounded-xl border border-line bg-surface">
            {officeHours.map((o) => (
              <li key={o.starts_at + o.who} className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-3 ${o.can_make === false ? "text-ink-faint" : ""}`}>
                <span>
                  <span className="font-semibold">{o.who}</span>
                  {o.course && <span className="ml-2 text-sm font-semibold text-ink-soft">{o.course}</span>}
                  {o.location && <span className="ml-2 text-sm text-ink-muted">{o.location}</span>}
                </span>
                <span className="text-sm">
                  {formatWhen(o.starts_at)} to {clock(new Date(o.ends_at))}
                  {o.can_make === true && <span className="ml-2 font-semibold text-forest">You&apos;re free</span>}
                  {o.can_make === false && <span className="ml-2">Clashes with a class</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ItemList title="Appointments and events this week" items={thisWeek} onStatus={setStatus}
        empty="No appointments or events in the next 7 days." />

      {adding && <ImportDialog only="schedule" onClose={() => setAdding(false)} onImported={(m) => { setNotice(m); reload(); }} />}
    </div>
  );
}
