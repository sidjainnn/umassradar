"use client";

import { useState } from "react";
import { Minuteman } from "@/components/mascot/Minuteman";

type Feature = {
  id: string; tab: string; title: string; body: string; tint: string; ink: string;
  rows: { title: string; meta: string; dot: string }[];
};

const FEATURES: Feature[] = [
  {
    id: "todo", tab: "Deadlines", title: "Every due date, found for you",
    body: "Piazza, Gradescope, Canvas and your professors' emails become one list, sorted by what's due first, with the sentence each came from.",
    tint: "#fbe9ee", ink: "#6a0020",
    rows: [
      { title: "Quiz 6, STAT 315", meta: "Mon 11:59 PM", dot: "#840028" },
      { title: "Send transcript to Prof. Chen", meta: "Tue", dot: "#ffc72c" },
      { title: "Lab 6, ECE 122", meta: "Tomorrow 5 PM", dot: "#840028" },
    ],
  },
  {
    id: "schedule", tab: "Schedule", title: "Your week, with office hours you can actually make",
    body: "Upload a SPIRE or College Scheduler screenshot. Classes snap to the real catalog sections, and office hours are checked against them.",
    tint: "#e8eef7", ink: "#002554",
    rows: [
      { title: "COMPSCI 220, LEC01, HAS 134", meta: "Tue 4 PM", dot: "#002554" },
      { title: "Office hours: Prof. Minea", meta: "You're free", dot: "#44693d" },
      { title: "Advising with Jane Smith", meta: "Wed 2 PM", dot: "#002554" },
    ],
  },
  {
    id: "jobs", tab: "Jobs and clubs", title: "On-campus jobs and the clubs you follow",
    body: "Open roles from Dining, RecWell and Res Life, job emails, and every campus event. Follow a club and its meetings land on your schedule.",
    tint: "#eef4ec", ink: "#2f4a29",
    rows: [
      { title: "Dining student worker, Blue Wall", meta: "Hiring", dot: "#44693d" },
      { title: "Hackers Club general meeting", meta: "Thu 7 PM", dot: "#00aec7" },
      { title: "RA and PM applications", meta: "Due Dec 4", dot: "#44693d" },
    ],
  },
  {
    id: "housing", tab: "Housing", title: "Sublets, swaps and roommates, UMass only",
    body: "Post or find a sublet, trade on-campus rooms, and get roommate matches with reasons. Emails stay private until both of you say yes.",
    tint: "#fff6dc", ink: "#6b4b00",
    rows: [
      { title: "Spring sublet on Hazel Ave", meta: "$850/mo", dot: "#cb6015" },
      { title: "CS junior looking for a roommate", meta: "100% match", dot: "#44693d" },
      { title: "Swap: Southwest for Northeast", meta: "Wants yours", dot: "#cb6015" },
    ],
  },
];

export function FeatureTabs() {
  const [active, setActive] = useState(FEATURES[0].id);
  const f = FEATURES.find((x) => x.id === active)!;

  return (
    <section className="mx-auto max-w-5xl px-6 py-24" aria-labelledby="features-h">
      <h2 id="features-h" className="text-center font-display text-[34px] font-extrabold leading-[1.1] tracking-[-0.035em] text-ink sm:text-[44px]">
        One place for the stuff UMass emails you about
      </h2>
      <div role="tablist" className="mx-auto mt-8 flex w-fit flex-wrap justify-center gap-2 rounded-full bg-paper p-1.5">
        {FEATURES.map((x) => (
          <button key={x.id} role="tab" aria-selected={active === x.id} onClick={() => setActive(x.id)}
            className={`rounded-full px-4 py-2 text-[15px] font-semibold transition ${active === x.id ? "bg-ink text-white shadow" : "text-ink-soft hover:text-ink"}`}>
            {x.tab}
          </button>
        ))}
      </div>

      <div key={f.id} role="tabpanel" className="rise relative mt-14 grid gap-8 rounded-[32px] p-8 sm:p-12 md:grid-cols-[1fr_1.05fr]" style={{ background: f.tint }}>
        <div className="self-center">
          <h3 className="font-display text-[30px] font-extrabold leading-[1.1] tracking-[-0.03em]" style={{ color: f.ink }}>{f.title}</h3>
          <p className="mt-4 max-w-[46ch] text-[17px] leading-relaxed text-ink-soft">{f.body}</p>
        </div>
        <div className="relative">
          <div className="absolute -top-14 right-4 z-10 hidden md:block"><Minuteman size={96} /></div>
          <ul className="relative space-y-3 rounded-[24px] bg-white p-4 shadow-[0_30px_60px_-30px_rgba(60,0,20,0.35)]">
            {f.rows.map((r) => (
              <li key={r.title} className="flex items-center gap-3 rounded-2xl border border-line-soft px-4 py-3.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.dot }} />
                <span className="flex-1 text-[15px] font-semibold text-ink">{r.title}</span>
                <span className="text-sm text-ink-muted">{r.meta}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
