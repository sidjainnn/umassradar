"use client";

import { CalendarCheck, CalendarX, Clock, MapPin } from "lucide-react";
import type { OfficeHourSlot } from "@/lib/api";
import { clock, formatWhen } from "@/lib/time";

export function OfficeHours({ slots, calendarConnected }: { slots: OfficeHourSlot[]; calendarConnected: boolean }) {
  if (slots.length === 0) return null;
  return (
    <section className="office-hours-section lg:col-span-2">
      <div className="mb-3 flex flex-col items-start gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
          Office hours this week <span className="ml-1 text-stone-400">{slots.length}</span>
        </h2>
        <span className="text-xs text-stone-400">
          {calendarConnected ? "Checked against your calendar" : "From your syllabi"}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {slots.map((s, i) => (
          <div
            key={i}
            className={`rounded-xl border bg-white p-4 ${s.can_make === false ? "border-stone-200 opacity-60" : "border-stone-200"}`}
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              {s.course && <span className="rounded-full bg-stone-900 px-2 py-0.5 font-medium text-white">{s.course}</span>}
              {s.can_make === true && (
                <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                  <CalendarCheck className="h-3.5 w-3.5" /> You&apos;re free
                </span>
              )}
              {s.can_make === false && (
                <span className="inline-flex items-center gap-1 text-stone-500">
                  <CalendarX className="h-3.5 w-3.5" /> Conflicts
                </span>
              )}
            </div>
            <p className="mt-2 font-semibold text-stone-900">{s.who}</p>
            <p className="mt-1 flex items-center gap-1 text-sm text-stone-600">
              <Clock className="h-3.5 w-3.5" /> {formatWhen(s.starts_at)}–{clock(new Date(s.ends_at))}
            </p>
            {s.location && (
              <p className="mt-0.5 flex items-center gap-1 text-sm text-stone-600">
                <MapPin className="h-3.5 w-3.5" /> {s.location}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
