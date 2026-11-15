"use client";

import Link from "next/link";
import { useState } from "react";
import { externalUrl, feedback, jobsData, type Job } from "@/lib/features";
import { useResource } from "@/lib/useResource";
import { useFocusItem } from "@/lib/useFocus";
import { ResourceError } from "./ResourceError";

export function JobsPanel() {
  const [sort, setSort] = useState("match");
  const [includeHidden, setIncludeHidden] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const jobs = useResource(`/jobs?sort=${sort}&include_hidden=${includeHidden}`, jobsData);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useFocusItem(jobs.data !== null);
  async function act(job: Job, action: Parameters<typeof feedback>[1]) {
    setBusy(job.id); setError(null); setNotice(null);
    try {
      await feedback(job.id, action);
      if (action === "applied") setNotice("Added to your application tracker.");
      if (action !== "opened") jobs.reload();
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't update this job."); }
    finally { setBusy(null); }
  }
  const shown = jobs.data?.jobs.filter((j) => !savedOnly || j.saved) ?? [];
  const button = "rounded-full border border-line px-3 py-1.5 text-xs font-semibold hover:border-maroon-400 disabled:opacity-40";
  return <section className="space-y-4" aria-label="Jobs for you">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-xl font-extrabold">Jobs for you</h2>
      <p className="mt-1 text-sm text-ink-muted">{jobs.data?.personalized ? "Ranked by your interests, preferences and matching activity." : "Set your preferences to get job matches that fit you."}</p></div>
      <div className="flex flex-wrap gap-3 text-sm font-semibold text-maroon-700"><Link href="/preferences" className="underline">Edit preferences</Link><Link href="/applications" className="underline">Your applications</Link></div></div>
    <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-white p-3 ring-1 ring-line-soft">
      <label className="flex items-center gap-2 text-sm">Sort by <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-line p-2"><option value="match">Best match</option><option value="deadline">Deadline</option></select></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={savedOnly} onChange={(e) => setSavedOnly(e.target.checked)} />Saved only</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeHidden} onChange={(e) => setIncludeHidden(e.target.checked)} />Show hidden{jobs.data?.hidden ? ` (${jobs.data.hidden})` : ""}</label>
    </div>
    {(jobs.error || error) && <ResourceError message={jobs.error ?? error!} retry={jobs.error ? jobs.reload : undefined} />}
    {notice && <p role="status" className="rounded-xl bg-maroon-50 p-3 text-sm text-maroon-800">{notice}</p>}
    {!jobs.data && !jobs.error && <p role="status" className="text-sm text-ink-muted">Finding your matches…</p>}
    {jobs.data && shown.length === 0 && <p className="rounded-2xl border border-dashed border-line p-5 text-sm text-ink-muted">{savedOnly ? "No saved jobs yet. Save an opening to keep it here." : "No jobs match right now. Adjust your preferences or check back after your next email sync."}</p>}
    <ul className="space-y-3">{shown.map((j) => {
      const url = externalUrl(j.url);
      return <li key={j.id} id={`item-${j.id}`} className={`rounded-[24px] border border-line-soft bg-white p-5 ${j.hidden ? "opacity-70" : ""}`}>
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-semibold">{j.title}</h3><p className="mt-1 text-xs text-ink-muted">{[j.sender, ...j.types.map((t) => t.replaceAll("_", " ")), j.place?.replaceAll("_", " ")].filter(Boolean).join(" · ")}</p></div>
          <span className="shrink-0 rounded-full bg-maroon-50 px-3 py-1 text-xs font-bold text-maroon-800">{j.match}% match</span></div>
        {!!j.reasons.length && <ul className="mt-3 space-y-1 text-sm text-ink-soft">{j.reasons.map((r, i) => <li key={i}>• {r}</li>)}</ul>}
        {j.due_at && <p className="mt-3 text-xs font-semibold text-ink-muted">Deadline: {new Date(j.due_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>}
        {j.evidence && <details className="mt-3 text-sm text-ink-muted"><summary className="cursor-pointer">From your email</summary><p className="mt-2 border-l-2 border-maroon-200 pl-3">{j.evidence}</p></details>}
        <div className="mt-4 flex flex-wrap gap-2">
          {url && <a href={url} target="_blank" rel="noreferrer" onClick={() => { void act(j, "opened"); }} className="rounded-full bg-maroon-600 px-3 py-1.5 text-xs font-semibold text-white">Open job ↗</a>}
          <button disabled={busy !== null} onClick={() => act(j, j.saved ? "unsave" : "saved")} className={button}>{j.saved ? "Unsave" : "Save"}</button>
          <button disabled={busy !== null} onClick={() => act(j, j.hidden ? "unhide" : "hidden")} className={button}>{j.hidden ? "Unhide" : "Hide"}</button>
          <button disabled={busy !== null} onClick={() => act(j, "applied")} className={button}>I applied</button>
          {!j.hidden && <button disabled={busy !== null} onClick={() => act(j, "not_interested")} className={button}>Not interested</button>}
        </div>
      </li>;
    })}</ul>
    {!!jobs.data?.filtered_out.length && <details className="rounded-2xl border border-line-soft bg-white p-4 text-sm"><summary className="cursor-pointer font-semibold">Hidden by your preferences ({jobs.data.filtered_out.length})</summary>
      <ul className="mt-3 space-y-3">{jobs.data.filtered_out.map((j) => <li key={j.id}><p className="font-semibold">{j.title}</p><p className="text-ink-muted">{j.reason}</p></li>)}</ul></details>}
  </section>;
}
