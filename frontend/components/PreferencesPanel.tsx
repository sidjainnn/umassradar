"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { listData, preferencesData, type LearningEvent, type Preferences, type Question } from "@/lib/features";
import { useResource } from "@/lib/useResource";
import { ResourceError } from "./ResourceError";

function Tags({ values, onChange, question }: { values: string[]; onChange: (v: string[]) => void; question: Question }) {
  const [draft, setDraft] = useState("");
  function add(value: string) {
    const next = [...values];
    for (const tag of value.split(",").map((s) => s.trim()).filter(Boolean)) {
      if (!next.some((t) => t.toLowerCase() === tag.toLowerCase()) && next.length < (question.max ?? 20)) next.push(tag.slice(0, 60));
    }
    onChange(next); setDraft("");
  }
  return <div className="space-y-2">
    <div className="flex flex-wrap gap-2">{values.map((v) => <button key={v} type="button" onClick={() => onChange(values.filter((x) => x !== v))}
      aria-label={`Remove ${v}`} className="rounded-full bg-maroon-100 px-3 py-1 text-sm text-maroon-800">{v} ×</button>)}</div>
    <div className="flex gap-2"><input aria-label={`Add ${question.label}`} value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={240}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(draft); } }} onBlur={() => { if (draft.trim()) add(draft); }}
      placeholder="Type a tag, then press Enter" className="min-w-0 flex-1 rounded-xl border border-line px-3 py-2 text-sm" />
      <button type="button" disabled={!draft.trim()} onClick={() => add(draft)} className="rounded-full border border-line px-3 text-sm disabled:opacity-40">Add</button></div>
    {!!question.suggestions?.length && <div className="flex flex-wrap gap-1.5">{question.suggestions.filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase())).map((s) =>
      <button key={s} type="button" onClick={() => add(s)} className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-muted hover:border-maroon-400">+ {s}</button>)}</div>}
  </div>;
}

function PreferencesForm({ questions, initial, onSaved }: { questions: Question[]; initial: Preferences; onSaved: (interests: string[]) => void }) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const set = (key: keyof Preferences, value: Preferences[keyof Preferences]) => { setValues((v) => ({ ...v, [key]: value })); setSaved(false); };
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try { const result = await api<{ top_interests: string[] }>("/preferences", { method: "PUT", body: JSON.stringify(values) }); setSaved(true); onSaved(result.top_interests); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't save your preferences."); }
    finally { setBusy(false); }
  }
  const input = "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm";
  return <form onSubmit={save} className="space-y-6">
    {questions.map((q) => <fieldset key={q.id} className="space-y-2">
      <legend className="text-sm font-semibold text-ink">{q.label}{q.unit ? ` (${q.unit})` : ""}</legend>
      {q.hint && <p className="text-xs text-ink-muted">{q.hint}</p>}
      {q.type === "tags" && <Tags values={(values[q.id] as string[]) ?? []} onChange={(v) => set(q.id, v)} question={q} />}
      {q.type === "multi" && <div className="flex flex-wrap gap-2">{q.options?.map((o) => {
        const selected = ((values[q.id] as string[]) ?? []).includes(o.value);
        return <label key={o.value} className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm ${selected ? "border-maroon-200 bg-maroon-50 text-maroon-800" : "border-line"}`}>
          <input type="checkbox" checked={selected} onChange={() => set(q.id, selected ? (values[q.id] as string[]).filter((v) => v !== o.value) : [...((values[q.id] as string[]) ?? []), o.value])} className="accent-maroon-600" />{o.label ?? o.value.replaceAll("_", " ")}</label>;
      })}</div>}
      {q.type === "boolean" && <select aria-label={q.label} value={values[q.id] == null ? "" : String(values[q.id])} onChange={(e) => set(q.id, e.target.value === "" ? null : e.target.value === "true")} className={input}>
        {q.id !== "learn_from_email" && <option value="">Prefer not to say</option>}<option value="true">Yes</option><option value="false">No</option></select>}
      {q.type === "number" && <input aria-label={q.label} type="number" step={q.id === "min_pay" ? "0.01" : "1"} min={q.min} max={q.max} value={(values[q.id] as number | null) ?? ""}
        onChange={(e) => set(q.id, e.target.value === "" ? null : Number(e.target.value))} className={input} />}
      {q.type === "text" && <input aria-label={q.label} maxLength={20} value={(values[q.id] as string | null) ?? ""} onChange={(e) => set(q.id, e.target.value || null)} className={input} />}
    </fieldset>)}
    {error && <ResourceError message={error} />}
    {saved && <p role="status" className="text-sm text-forest">Preferences saved. Your job matches will use these answers.</p>}
    <button disabled={busy} className="rounded-full bg-maroon-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-maroon-700 disabled:opacity-50">{busy ? "Saving…" : "Save preferences"}</button>
  </form>;
}

export function PreferencesPanel({ onboarding = false, onSaved }: { onboarding?: boolean; onSaved?: () => void }) {
  const [updatedInterests, setUpdatedInterests] = useState<string[] | null>(null);
  const questions = useResource<Question[]>("/preferences/questions", listData<Question>);
  const prefs = useResource("/preferences", preferencesData);
  return <section className="rounded-[24px] border border-line-soft bg-white p-5 sm:p-7">
    <h2 className="font-display text-xl font-extrabold">{onboarding ? "Make this yours" : "Your work preferences"}</h2>
    <p className="mb-6 mt-2 text-sm text-ink-muted">Choose the work you want to see. You can update these answers and turn email learning off any time.</p>
    {questions.error ? <ResourceError message={questions.error} retry={questions.reload} /> : prefs.error ? <ResourceError message={prefs.error} retry={prefs.reload} /> : !questions.data || !prefs.data ?
      <p role="status" className="text-sm text-ink-muted">Loading preferences…</p> :
      <PreferencesForm questions={questions.data} initial={prefs.data.prefs} onSaved={(interests) => { setUpdatedInterests(interests); onSaved?.(); }} />}
    {!!(updatedInterests ?? prefs.data?.top_interests)?.length && <p className="mt-5 text-xs text-ink-muted">Current matching interests: {(updatedInterests ?? prefs.data?.top_interests)?.join(", ")}</p>}
  </section>;
}

export function LearningLog() {
  const log = useResource<LearningEvent[]>("/preferences/log", listData<LearningEvent>);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function forget(id: string) {
    setBusy(id); setError(null);
    try { await api(`/preferences/log/${encodeURIComponent(id)}`, { method: "DELETE" }); log.reload(); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't forget this entry."); } finally { setBusy(null); }
  }
  return <section className="rounded-[24px] border border-line-soft bg-white p-5 sm:p-7">
    <h2 className="font-display text-xl font-extrabold">What shaped your matches</h2>
    <p className="mt-2 text-sm text-ink-muted">See what came from your email or your actions. Forget an entry to remove its influence on job matching.</p>
    {(log.error || error) && <div className="mt-3"><ResourceError message={log.error ?? error!} retry={log.error ? log.reload : undefined} /></div>}
    {!log.data && !log.error && <p role="status" className="mt-3 text-sm">Loading activity…</p>}
    {log.data?.length === 0 && <p className="mt-4 text-sm text-ink-muted">No matching activity yet.</p>}
    <ul className="mt-4 divide-y divide-line-soft">{log.data?.map((e) => <li key={e.id} className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0"><p className="text-sm font-semibold">{e.label}: {e.title}</p><p className="mt-1 text-xs text-ink-muted">{e.source === "email" ? "From email" : "Your action"} · {new Date(e.at).toLocaleDateString()}{e.terms.length ? ` · ${e.terms.join(", ")}` : ""}</p></div>
      <button disabled={busy !== null} onClick={() => forget(e.id)} aria-label={`Forget ${e.title}`} className="shrink-0 text-xs font-semibold text-maroon-700 disabled:opacity-50">{busy === e.id ? "Forgetting…" : "Forget"}</button>
    </li>)}</ul>
  </section>;
}
