"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { formatWhen } from "@/lib/time";

type Progress = { done: number; total: number; streak: number; today_cleared: boolean; countdowns: { course: string | null; title: string; when: string; days: number }[] };

export function StudentProgress() {
  const { items } = useStore();
  const [progress, setProgress] = useState<Progress | null>(null);
  useEffect(() => {
    let current = true;
    api<Progress>("/progress").then((p) => {
      if (current && typeof p.done === "number" && typeof p.total === "number" && typeof p.streak === "number" && Array.isArray(p.countdowns)) setProgress(p);
    }).catch(() => { if (current) setProgress(null); });
    return () => { current = false; };
  }, [items]);
  if (!progress) return null;
  const percent = progress.total ? Math.min(100, Math.round(progress.done / progress.total * 100)) : 0;
  return <section className="dashboard-card p-5" aria-labelledby="progress-heading">
    <p className="section-kicker">Your momentum</p><h2 id="progress-heading" className="mt-1 font-serif text-xl font-semibold">Weekly progress</h2>
    <p className="mt-3 text-sm text-ink-muted">{progress.total ? `${progress.done} of ${progress.total} deadlines completed` : "No deadlines due this week."}</p>
    <progress aria-label="Deadlines completed this week" value={progress.done} max={Math.max(1, progress.total)} className="mt-3 h-3 w-full accent-maroon-600" />
    <p className="mt-2 text-xs text-ink-muted">{percent}% complete · {progress.streak} good {progress.streak === 1 ? "week" : "weeks"} in a row</p>
    <p className="mt-1 text-[11px] text-ink-faint">A good week means finishing at least 80% of its deadlines.</p>
    {progress.today_cleared && <p role="status" className="mt-4 rounded-xl bg-forest/10 p-3 text-sm font-semibold text-forest">Today’s deadlines are all done. Nice work.</p>}
    {progress.countdowns.length > 0 && <div className="mt-5 border-t border-line pt-4"><h3 className="text-sm font-semibold">Exams coming up</h3><ul className="mt-3 space-y-3">{progress.countdowns.map((exam, index) => <li key={`${exam.when}-${index}`} className="flex items-start justify-between gap-3 text-sm"><span>{exam.course ? <Link href={`/courses/${encodeURIComponent(exam.course)}`} className="font-semibold text-maroon-600 hover:underline">{exam.course}</Link> : null}<span className="block">{exam.title}</span><time className="text-xs text-ink-muted">{formatWhen(exam.when)}</time></span><span className="shrink-0 rounded-lg bg-maroon-50 px-2 py-1 text-xs font-bold text-maroon-700">{exam.days === 0 ? "Today" : `${exam.days}d`}</span></li>)}</ul></div>}
  </section>;
}
