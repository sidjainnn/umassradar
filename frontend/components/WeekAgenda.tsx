"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { clock, dayKey, easternTime, easternWeekday, longDate } from "@/lib/time";

type WeekEntry = {
  id: string; title: string; kind: string; subtitle: string | null;
  start: string; end: string | null; all_day: boolean; location: string | null;
  course: string | null; href: string | null; editable: boolean; series_id?: string | null;
  can_make?: boolean | null;
};
type Week = { start: string; calendar_connected: boolean; entries: WeekEntry[] };
type Draft = { title: string; start: string; end: string; location: string; course: string; kind: "appointment" | "event"; repeat: string };
const EMPTY: Draft = { title: "", start: "", end: "", location: "", course: "", kind: "appointment", repeat: "" };
const LABELS: Record<string, string> = { class: "Class", section: "Section", deadline: "Due", office_hours: "Office hours", google: "Google Calendar", appointment: "Appointment", event: "Event", club: "Club event" };

function shift(day: string, days: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
function currentMonday() { return shift(dayKey(new Date()), -easternWeekday()); }
function instant(value: string) { const [day, time] = value.split("T"); return easternTime(day, time).toISOString(); }
function localInput(value: string) {
  const date = new Date(value);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  return `${dayKey(date)}T${time}`;
}

export function WeekAgenda() {
  const { me, reload } = useStore();
  const [start, setStart] = useState(currentMonday);
  const [week, setWeek] = useState<Week | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const request = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++request.current;
    setLoading(true);
    setError("");
    setWeek(null);
    try {
      const result = await api<Week>(`/schedule/week?start=${start}`);
      if (currentRequest !== request.current) return;
      if (!result || !Array.isArray(result.entries) || result.entries.some((entry) => !entry || !Number.isFinite(Date.parse(entry.start)))) throw new Error("The weekly agenda is temporarily unavailable.");
      setWeek(result);
    } catch (e) { if (currentRequest === request.current) setError(e instanceof Error ? e.message : "Could not load your week."); }
    finally { if (currentRequest === request.current) setLoading(false); }
  }, [start]);
  useEffect(() => { void load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setFormError("");
    if (draft.end && draft.end <= draft.start) { setFormError("Choose an end time after the start."); return; }
    if (draft.repeat && draft.repeat < draft.start.slice(0, 10)) { setFormError("The repeat end date must be on or after the event date."); return; }
    setBusy(true);
    try {
      const body = { title: draft.title.trim(), starts_at: instant(draft.start), ends_at: draft.end ? instant(draft.end) : null, location: draft.location.trim() || null,
        ...(!editing ? { course: draft.course.trim() || null, kind: draft.kind, repeat_until: draft.repeat || null } : {}) };
      await api(editing ? `/events/${encodeURIComponent(editing)}` : "/events", { method: editing ? "PATCH" : "POST", body: JSON.stringify(body) });
      setDraft(null); setEditing(null);
      await Promise.all([load(), reload()]);
    } catch (e) { setFormError(e instanceof Error ? e.message : "Could not save the event."); }
    finally { setBusy(false); }
  }

  async function remove(entry: WeekEntry) {
    if (!window.confirm(`Delete “${entry.title}”? This removes this occurrence only.`)) return;
    setBusy(true);
    try {
      await api(`/events/${encodeURIComponent(entry.id)}`, { method: "DELETE" });
      await Promise.all([load(), reload()]);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not delete the event."); }
    finally { setBusy(false); }
  }

  return (
    <section className="dashboard-card" aria-labelledby="week-agenda-title">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line-soft p-5">
        <div><p className="section-kicker">All your plans together</p><h2 id="week-agenda-title" className="mt-1 font-serif text-xl font-semibold">This week</h2><p className="mt-1 text-xs text-ink-muted">Classes, deadlines, office hours and events · Eastern time</p></div>
        <button disabled={me.demo || busy} onClick={() => { setDraft(EMPTY); setEditing(null); setFormError(""); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-maroon-600 px-4 text-sm font-semibold text-white disabled:opacity-40" title={me.demo ? "Sign in to add your own events" : "Add an event"}><Plus className="h-4 w-4" /> Add event</button>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-5 py-3">
        <button aria-label="Previous week" onClick={() => setStart(shift(start, -7))} className="grid h-10 w-10 place-items-center rounded-lg border border-line"><ChevronLeft className="h-4 w-4" /></button>
        <button aria-label="Next week" onClick={() => setStart(shift(start, 7))} className="grid h-10 w-10 place-items-center rounded-lg border border-line"><ChevronRight className="h-4 w-4" /></button>
        <span className="text-sm font-semibold">{start} – {shift(start, 6)}</span>
        <button onClick={() => setStart(currentMonday())} className="ml-auto rounded-lg bg-paper px-3 py-2 text-xs font-semibold">This week</button>
      </div>
      {draft && <form onSubmit={save} className="space-y-4 border-b border-line bg-maroon-50/50 p-5">
        <h3 className="font-semibold">{editing ? "Edit event" : "Add your own event"}</h3>
        <p className="text-xs text-ink-muted">Times are in Amherst / Eastern time. Events stay in Radar.</p>
        {formError && <p role="alert" className="text-sm text-maroon-700">{formError}</p>}
        <label className="block text-sm font-semibold">Title<input required maxLength={200} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="mt-1 block w-full rounded-lg border border-line bg-white p-2 font-normal" /></label>
        <div className="grid gap-3 sm:grid-cols-2">{(["start", "end"] as const).map((key) => <label key={key} className="min-w-0 text-sm font-semibold">{key === "start" ? "Starts" : "Ends (optional)"}<input type="datetime-local" required={key === "start"} value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} className="mt-1 block w-full min-w-0 rounded-lg border border-line bg-white p-2 font-normal" /></label>)}</div>
        <label className="block text-sm font-semibold">Location (optional)<input maxLength={200} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} className="mt-1 block w-full rounded-lg border border-line bg-white p-2 font-normal" /></label>
        {!editing && <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-semibold">Type<select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Draft["kind"] })} className="mt-1 block w-full rounded-lg border border-line bg-white p-2 font-normal"><option value="appointment">Appointment</option><option value="event">Event</option></select></label>
          <label className="text-sm font-semibold">Course (optional)<input maxLength={40} value={draft.course} onChange={(e) => setDraft({ ...draft, course: e.target.value })} className="mt-1 block w-full rounded-lg border border-line bg-white p-2 font-normal" /></label>
          <label className="min-w-0 text-sm font-semibold">Repeat weekly until<input type="date" value={draft.repeat} onChange={(e) => setDraft({ ...draft, repeat: e.target.value })} className="mt-1 block w-full min-w-0 rounded-lg border border-line bg-white p-2 font-normal" /></label>
        </div>}
        <div className="flex gap-3"><button disabled={busy} className="rounded-lg bg-maroon-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save event"}</button><button type="button" disabled={busy} onClick={() => setDraft(null)} className="px-3 py-2 text-sm font-semibold">Cancel</button></div>
      </form>}
      {loading ? <p role="status" className="p-5 text-sm text-ink-muted">Loading your week…</p> : error ? <div role="alert" className="p-5 text-sm text-ink-muted">{error} <button onClick={() => void load()} className="font-semibold text-maroon-600 underline">Try again</button></div> : <div className="divide-y divide-line-soft">
        {Array.from({ length: 7 }, (_, index) => shift(start, index)).map((day) => {
          const entries = (week?.entries ?? []).filter((entry) => dayKey(new Date(entry.start)) === day);
          return <div key={day} className="p-5"><h3 className={`text-sm font-bold ${day === dayKey(new Date()) ? "text-maroon-600" : "text-ink"}`}>{longDate(easternTime(day, "12:00"))}</h3>
            {entries.length === 0 ? <p className="mt-2 text-xs text-ink-faint">No plans scheduled.</p> : <ul className="mt-3 space-y-3">{entries.map((entry) => <li key={entry.id} className="flex flex-wrap items-start gap-3 rounded-xl border border-line-soft bg-paper/50 p-3">
              <time className="min-w-20 text-xs font-semibold text-maroon-600">{entry.all_day ? "All day" : clock(new Date(entry.start))}{entry.end && !entry.all_day ? ` – ${clock(new Date(entry.end))}` : ""}</time>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{entry.title}</p><p className="mt-1 text-xs text-ink-muted">{[LABELS[entry.kind] ?? entry.kind, entry.course, entry.location].filter(Boolean).join(" · ")}</p>{entry.can_make !== null && entry.can_make !== undefined && <p className="mt-1 text-xs text-ink-muted">{entry.can_make ? "You’re free" : "Clashes with another plan"}</p>}</div>
              {entry.editable && !me.demo && <div className="flex gap-3 text-xs font-semibold"><button disabled={busy} onClick={() => { setEditing(entry.id); setFormError(""); setDraft({ ...EMPTY, title: entry.title, start: localInput(entry.start), end: entry.end ? localInput(entry.end) : "", location: entry.location ?? "" }); }} className="text-maroon-600">Edit</button><button disabled={busy} onClick={() => void remove(entry)} className="text-ink-muted">Delete</button></div>}
            </li>)}</ul>}
          </div>;
        })}
      </div>}
    </section>
  );
}
