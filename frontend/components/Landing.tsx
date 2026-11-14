"use client";

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
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
      <Logo />
      <div className="grid flex-1 items-center gap-14 py-12 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <h1 className="font-serif text-[42px] font-semibold leading-[1.12] text-ink sm:text-[52px]">
            Everything UMass needs from you, in one place.
          </h1>
          <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-ink-soft">
            UMass Radar reads your UMass email, Canvas and class schedule, and pulls out the deadlines, appointments,
            replies you owe and opportunities. Promotions and newsletters are filtered out.
          </p>
          {notice && <p role="alert" className="mt-6 rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink-soft">{notice}</p>}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="/api/auth/login" className="rounded-lg bg-maroon-600 px-5 py-3 font-semibold text-white hover:bg-maroon-700">
              Sign in with your UMass Google account
            </a>
            {onDemo && (
              <button onClick={onDemo} disabled={demoLoading}
                className="rounded-lg border border-line bg-surface px-5 py-3 font-semibold text-ink hover:border-ink-faint disabled:opacity-60">
                {demoLoading ? "Loading the demo…" : "Try it with a demo inbox"}
              </button>
            )}
          </div>
          <p className="mt-4 max-w-[52ch] text-[13px] leading-relaxed text-ink-muted">
            Read-only access. Email bodies are never stored, tokens are encrypted, and you can delete everything in one click.
          </p>
        </div>

        <figure aria-label="Example of a student's day in UMass Radar" className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
          <figcaption className="font-serif text-xl font-semibold text-ink">Today</figcaption>
          <ol className="relative mt-5">
            <span aria-hidden className="absolute bottom-3 left-[calc(4.75rem+1rem)] top-3 w-px bg-line" />
            {SAMPLE.slice(0, 1).map((e) => <Row key={e.title} {...e} />)}
            <li className="grid grid-cols-[4.75rem_1fr] items-center gap-4 py-1.5">
              <span className="text-right text-sm font-bold text-maroon-600">Now</span>
              <span className="relative h-0.5 bg-maroon-600"><span className="absolute -left-[5px] -top-[4px] h-2.5 w-2.5 rounded-full bg-maroon-600" /></span>
            </li>
            {SAMPLE.slice(1).map((e) => <Row key={e.title} {...e} />)}
          </ol>
        </figure>
      </div>
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
