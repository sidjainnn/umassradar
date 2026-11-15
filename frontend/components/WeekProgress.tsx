"use client";

import { Flame, GraduationCap } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type Item } from "@/lib/api";
import { SamSays } from "./mascot/SamSays";

type Progress = {
  done: number; total: number; streak: number; today_cleared: boolean;
  countdowns: { course: string | null; title: string; when: string; days: number; source: string }[];
};

function Ring({ value }: { value: number }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#f6dde4" strokeWidth="8" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="url(#ring)" strokeWidth="8" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - value)} style={{ transition: "stroke-dashoffset 700ms cubic-bezier(.2,.8,.2,1)" }} />
      <defs><linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#c23a5f" /><stop offset="100%" stopColor="#840028" /></linearGradient></defs>
    </svg>
  );
}

/** "Your week": share of this week's deadlines done, the streak of good weeks, and exam countdowns. */
export function WeekProgress({ items }: { items: Item[] | null }) {
  const [p, setP] = useState<Progress | null>(null);
  // refetch whenever something gets checked off
  const doneKey = items?.map((i) => i.id).join(",");
  useEffect(() => { api<Progress>("/progress").then(setP).catch(() => {}); }, [doneKey]);
  if (!p) return <div className="h-28 animate-pulse rounded-[24px] bg-line-soft" />;
  const pct = p.total ? p.done / p.total : 0;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr]">
        <div className="flex items-center gap-4 rounded-[24px] bg-white p-4 ring-1 ring-line-soft">
          <div className="relative">
            <Ring value={pct} />
            <span className="absolute inset-0 grid place-items-center font-display text-[15px] font-extrabold">{Math.round(pct * 100)}%</span>
          </div>
          <div>
            <p className="font-display text-[17px] font-extrabold tracking-[-0.02em]">This week</p>
            <p className="text-sm text-ink-muted">{p.total ? `${p.done} of ${p.total} deadlines done` : "Nothing due this week yet"}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-[24px] bg-[linear-gradient(160deg,#fff6dc,#ffffff)] p-4 ring-1 ring-[#f6e3a8]">
          <span className="grid h-14 w-14 place-items-center rounded-[20px] bg-[linear-gradient(160deg,#ffcf4d,#cb6015)] text-white shadow-[inset_0_2px_0_rgba(255,255,255,0.45),0_12px_20px_-10px_rgba(120,60,0,0.6)]">
            <Flame className="h-7 w-7" strokeWidth={2.2} />
          </span>
          <div>
            <p className="font-display text-[17px] font-extrabold tracking-[-0.02em]">{p.streak} week{p.streak === 1 ? "" : "s"} in a row</p>
            <p className="text-sm text-ink-muted">Weeks you finished at least 80% of what was due</p>
          </div>
        </div>
      </div>

      {p.countdowns.length > 0 && (
        <ul className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {p.countdowns.map((c) => (
            <li key={c.when + c.title} className="shrink-0">
              <Link href={c.course ? `/courses/${encodeURIComponent(c.course)}` : "/todo"}
                className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-4 text-sm ring-1 ring-line-soft hover:ring-maroon-200">
                <span className={`grid h-8 min-w-8 place-items-center rounded-full px-2 font-display text-[13px] font-extrabold ${c.days <= 3 ? "bg-maroon-600 text-white" : "bg-maroon-50 text-maroon-700"}`}>
                  {c.days === 0 ? "Today" : `${c.days}d`}
                </span>
                <GraduationCap className="h-4 w-4 text-ink-faint" />
                <span className="font-semibold text-ink">{c.course ? `${c.course} ` : ""}{c.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {p.today_cleared && p.total > 0 && (
        <SamSays cheer>Nothing left due today. Nice work.</SamSays>
      )}
    </div>
  );
}
