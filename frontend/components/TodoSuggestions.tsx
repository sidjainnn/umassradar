"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { decideSuggestion, type Suggestion } from "@/lib/features";
import { useStore } from "@/lib/store";
import { ResourceError } from "./ResourceError";
import { formatTimeRange } from "@/lib/time";

export function TodoSuggestions({ suggestions, onChanged }: { suggestions: Suggestion[]; onChanged: () => void }) {
  const { reload, setNotice } = useStore();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gone, setGone] = useState<Set<string>>(new Set());
  async function decide(s: Suggestion, decision: "accept" | "dismiss") {
    setBusy(s.id); setError(null);
    if (decision === "dismiss") setGone((g) => new Set(g).add(s.id)); // hide the card right away
    try {
      if (decision === "accept" && s.action.type === "copy_text") await navigator.clipboard.writeText(s.action.text);
      await decideSuggestion(s.id, decision);
      if (decision === "accept") {
        if (s.action.type === "block_time") { await reload(); setNotice("Time added to your calendar."); }
        if (s.action.type === "copy_text") setNotice("Follow-up note copied. You can edit it before sending.");
        if (s.action.type === "open_job") router.push(`/opportunities?tab=jobs&focus=${encodeURIComponent(s.action.item_id)}`);
        if (s.action.type === "open_item") router.push(`/${s.kind === "housing" ? "housing" : "todo"}?focus=${encodeURIComponent(s.action.item_id)}`);
      }
      onChanged();
    } catch (e) {
      setGone((g) => { const n = new Set(g); n.delete(s.id); return n; });
      setError(e instanceof Error ? e.message : "Couldn't apply this suggestion.");
    }
    finally { setBusy(null); }
  }
  suggestions = suggestions.filter((s) => !gone.has(s.id));
  if (!suggestions.length && !error) return null;
  return <section className="mb-7 space-y-3" aria-label="Suggested next steps">
    <div><h2 className="font-display text-xl font-extrabold">A good next step</h2><p className="mt-1 text-sm text-ink-muted">Suggestions from your deadlines, applications and available time. You decide what happens.</p></div>
    {error && <ResourceError message={error} />}
    <ul className="grid gap-3 sm:grid-cols-2">{suggestions.map((s) => <li key={s.id} className="rounded-[24px] border border-maroon-100 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-maroon-600">{s.kind.replaceAll("_", " ")}</p>
      <h3 className="mt-2 font-semibold">{s.title}</h3><p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.why}</p>
      {s.action.type === "block_time" && <p className="mt-2 text-xs text-ink-muted" title="Eastern Time"><time dateTime={s.action.starts_at}>{formatTimeRange(s.action.starts_at, s.action.ends_at)}</time></p>}
      {s.action.type === "copy_text" && <details className="mt-3 text-sm text-ink-soft"><summary className="cursor-pointer">Preview the note</summary><p className="mt-2 whitespace-pre-wrap">{s.action.text}</p></details>}
      <div className="mt-4 flex flex-wrap gap-3"><button disabled={busy !== null} onClick={() => decide(s, "accept")} className="rounded-full bg-maroon-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{busy === s.id ? "Working…" : s.action.label}</button>
        <button disabled={busy !== null} onClick={() => decide(s, "dismiss")} className="text-xs font-semibold text-ink-muted disabled:opacity-40">Dismiss</button></div>
    </li>)}</ul>
  </section>;
}
