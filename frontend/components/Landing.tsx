"use client";

import { ArrowRight, ShieldCheck } from "lucide-react";
import { CampusPals } from "./CampusPals";
import { Logo } from "./Logo";

type Props = { notice: string | null; onDemo?: () => void; demoLoading?: boolean };

const SAMPLE = [
  { time: "10:00 AM", mark: "h-3 w-3 rounded-sm bg-ink", title: "ECE 122", detail: "Lecture, Marcus 131", past: true },
  { time: "2:00 PM", mark: "h-3 w-3 rounded-full bg-navy", title: "Advising with Jane Smith", detail: "Goodell 613" },
  { time: "4:00 PM", mark: "h-3 w-3 rounded-full border-2 border-forest bg-surface", title: "Office hours: Prof. Minea", detail: "You're free" },
  { time: "11:59 PM", mark: "h-3 w-3 rotate-45 bg-maroon-600", title: "Quiz 6 due", detail: "STAT 315, from Piazza" },
];

export function Landing({ notice, onDemo, demoLoading }: Props) {
  return (
    <main className="landing-shell mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-5 sm:px-6 sm:py-7">
      <header className="flex items-center justify-between px-1">
        <Logo size={36} />
        <span className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted sm:block">
          Less noise. More college.
        </span>
      </header>

      <section className="landing-hero mt-6 grid items-center gap-10 overflow-hidden rounded-[28px] border border-maroon-100 px-5 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14 lg:px-14">
        <div className="relative z-10">
          <p className="landing-pill inline-flex items-center gap-2 rounded-full border border-maroon-200 bg-white/80 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-maroon-700">
            <span className="h-2 w-2 rounded-full bg-maroon-600" />
            Your UMass day, sorted
          </p>
          <h1 className="mt-6 font-serif text-[42px] font-semibold leading-[1.08] tracking-[-0.035em] text-ink sm:text-[56px]">
            Everything UMass needs from you, <span className="text-maroon-600">in one calm place.</span>
          </h1>
          <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-ink-soft sm:text-lg">
            Radar reads your UMass email, Canvas and class schedule, then pulls out deadlines, appointments,
            replies and opportunities. The inbox noise stays out of the way.
          </p>
          {notice && (
            <p role="alert" className="mt-6 rounded-2xl border border-maroon-100 bg-white/80 px-4 py-3 text-sm text-ink-soft">
              {notice}
            </p>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a href="/api/auth/login" className="landing-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-maroon-600 px-6 py-3 font-semibold text-white hover:bg-maroon-700">
              Sign in with UMass Google <ArrowRight className="h-4 w-4" />
            </a>
            {onDemo && (
              <button onClick={onDemo} disabled={demoLoading}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-maroon-200 bg-white/85 px-6 py-3 font-semibold text-maroon-700 hover:border-maroon-400 hover:bg-white disabled:opacity-60">
                {demoLoading ? "Loading the demo…" : "Try the demo inbox"}
              </button>
            )}
          </div>
          <p className="mt-4 flex max-w-[54ch] items-start gap-2 text-[13px] leading-relaxed text-ink-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
            Read-only access. Email bodies are never stored, tokens are encrypted, and you can delete everything in one click.
          </p>
        </div>

        <figure aria-label="Example of a student's day in UMass Radar" className="landing-timeline relative z-10 rounded-[24px] border border-white/80 bg-white/88 p-5 shadow-[0_24px_60px_rgba(94,0,28,0.14)] backdrop-blur sm:p-7">
          <div className="flex items-center justify-between">
            <figcaption className="font-serif text-2xl font-semibold text-ink">Today</figcaption>
            <span className="rounded-full bg-maroon-50 px-3 py-1 text-xs font-semibold text-maroon-700">4 things</span>
          </div>
          <ol className="relative mt-5">
            <span aria-hidden className="absolute bottom-3 left-[calc(4.75rem+1rem)] top-3 w-px bg-line" />
            {SAMPLE.slice(0, 1).map((e) => <Row key={e.title} {...e} />)}
            <li className="grid grid-cols-[4.75rem_1fr] items-center gap-4 py-1.5">
              <span className="text-right text-sm font-bold text-maroon-600">Now</span>
              <span className="relative h-0.5 bg-maroon-600"><span className="absolute -left-[5px] -top-[4px] h-2.5 w-2.5 rounded-full bg-maroon-600" /></span>
            </li>
            {SAMPLE.slice(1).map((e) => <Row key={e.title} {...e} />)}
          </ol>
          <div className="landing-pals mt-4 border-t border-line-soft pt-3">
            <CampusPals />
          </div>
        </figure>
      </section>

      <section className="grid gap-4 py-6 sm:grid-cols-3" aria-label="How Radar helps">
        {[
          ["01", "Know what needs you", "Today’s priorities and the week ahead, without digging through messages."],
          ["02", "Keep every source", "See why an item matters and jump back to the original email or page."],
          ["03", "Make room for more", "Find campus opportunities, finish the task, and move on with your day."],
        ].map(([number, title, copy]) => (
          <article key={number} className="landing-benefit rounded-[20px] border border-line bg-white p-5">
            <span className="text-sm font-bold text-maroon-600">{number}</span>
            <h2 className="mt-3 font-serif text-xl font-semibold text-ink">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{copy}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

function Row({ time, mark, title, detail, past }: { time: string; mark: string; title: string; detail: string; past?: boolean }) {
  return (
    <li className={`grid grid-cols-[4.75rem_1fr] items-baseline gap-4 py-2.5 ${past ? "opacity-45" : ""}`}>
      <time className="text-right text-sm tabular-nums text-ink-muted">{time}</time>
      <div className="relative pl-6">
        <span className={`absolute left-[-6px] top-[7px] ${mark}`} />
        <span className="font-semibold text-ink">{title}</span>
        <span className="block text-sm text-ink-muted">{detail}</span>
      </div>
    </li>
  );
}
