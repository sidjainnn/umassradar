"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { listData, type Application, type ApplicationStage } from "@/lib/features";
import { useResource } from "@/lib/useResource";
import { ResourceError } from "./ResourceError";

const STAGES: Record<ApplicationStage, string> = { applied: "Applied", interview: "Interview", offer: "Offer", rejected: "Not selected" };
export function ApplicationsPanel() {
  const apps = useResource<Application[]>("/applications", listData<Application>);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [stage, setStage] = useState<ApplicationStage>("applied");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function mutate(path: string, method: string, body?: object) {
    setBusy(true); setError(null);
    try { await api(path, { method, body: body ? JSON.stringify(body) : undefined }); apps.reload(); return true; }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't update your applications."); return false; }
    finally { setBusy(false); }
  }
  const input = "min-w-0 rounded-xl border border-line bg-white px-3 py-2 text-sm";
  const shown = apps.data?.filter((a) => filter === "all" || a.stage === filter) ?? [];
  return <section className="space-y-5">
    <div><h2 className="font-display text-xl font-extrabold">Your applications</h2><p className="mt-1 text-sm text-ink-muted">Email confirmations update this tracker when email learning is on. Add an application from elsewhere by hand.</p></div>
    <form onSubmit={async (e) => { e.preventDefault(); if (await mutate("/applications", "POST", { company, role, stage })) { setCompany(""); setRole(""); } }} className="grid gap-3 rounded-[24px] bg-white p-5 ring-1 ring-line-soft sm:grid-cols-2">
      <label className="grid gap-1 text-xs font-semibold">Company<input required maxLength={60} value={company} onChange={(e) => setCompany(e.target.value)} className={input} /></label>
      <label className="grid gap-1 text-xs font-semibold">Role<input maxLength={80} value={role} onChange={(e) => setRole(e.target.value)} className={input} /></label>
      <label className="grid gap-1 text-xs font-semibold">Stage<select value={stage} onChange={(e) => setStage(e.target.value as ApplicationStage)} className={input}>{Object.entries(STAGES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <button disabled={busy || !company.trim()} className="self-end justify-self-start rounded-full bg-maroon-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">{busy ? "Saving…" : "Add application"}</button>
    </form>
    {(apps.error || error) && <ResourceError message={apps.error ?? error!} retry={apps.error ? apps.reload : undefined} />}
    <label className="flex items-center gap-3 text-sm">Show stage<select value={filter} onChange={(e) => setFilter(e.target.value)} className={input}><option value="all">All stages</option>{Object.entries(STAGES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
    {!apps.data && !apps.error && <p role="status" className="text-sm">Loading applications…</p>}
    {apps.data && !shown.length && <p className="rounded-2xl border border-dashed border-line p-5 text-sm text-ink-muted">No applications here yet.</p>}
    <ul className="space-y-3">{shown.map((a) => <li key={a.id} className="rounded-[24px] border border-line-soft bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">{a.company}</h3><p className="text-sm text-ink-muted">{a.role ?? "Role not specified"}</p></div><span className="rounded-full bg-maroon-50 px-3 py-1 text-xs font-semibold text-maroon-800">{STAGES[a.stage] ?? a.stage}</span></div>
      <p className="mt-3 text-xs text-ink-muted">Last update {new Date(a.last_at).toLocaleDateString()} · {a.days_quiet} day{a.days_quiet === 1 ? "" : "s"} since an update</p>
      <details className="mt-3 text-sm"><summary className="cursor-pointer text-ink-muted">Stage history</summary><ol className="mt-2 space-y-1">{a.history.map((h, i) => <li key={i}>{STAGES[h.stage] ?? h.stage} · {new Date(h.at).toLocaleDateString()}</li>)}</ol></details>
      <button disabled={busy} onClick={() => { if (confirm(`Remove the ${a.company} application from your tracker?`)) void mutate(`/applications/${encodeURIComponent(a.id)}`, "DELETE"); }} className="mt-3 text-xs font-semibold text-maroon-700 disabled:opacity-40">Remove application</button>
    </li>)}</ul>
  </section>;
}
