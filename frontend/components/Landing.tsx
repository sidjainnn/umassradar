"use client";

import { CalendarClock, Filter, MailCheck, ShieldCheck } from "lucide-react";
import { Logo } from "./Logo";

type Props = { notice: string | null; onDemo?: () => void; demoLoading?: boolean };

export function Landing({ notice, onDemo, demoLoading }: Props) {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-8">
      <Logo />
      <div className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-maroon-600">For UMass Amherst students</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-5xl">
            Everything UMass needs from you, <span className="text-maroon-600">in one place.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-stone-600">
            UMass Radar reads your UMass inbox and Canvas, pulls out the deadlines, appointments, replies you owe and
            opportunities, and hides the noise. Open it any time and know exactly what&apos;s next.
          </p>
          {notice && <p className="mt-6 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/api/auth/login"
              className="inline-flex items-center gap-2 rounded-xl bg-maroon-600 px-5 py-3 font-medium text-white shadow-sm hover:bg-maroon-700"
            >
              <MailCheck className="h-5 w-5" /> Sign in with UMass Google
            </a>
            {onDemo && (
              <button
                onClick={onDemo}
                disabled={demoLoading}
                className="rounded-xl border border-stone-300 bg-white px-5 py-3 font-medium text-stone-800 hover:border-stone-400 disabled:opacity-60"
              >
                {demoLoading ? "Loading demo inbox…" : "Load demo inbox"}
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-stone-500">Read-only Gmail access. Email bodies are never stored.</p>
        </div>
        <ul className="space-y-3">
          {[
            [CalendarClock, "Deadlines from Canvas, Gradescope, Piazza and Campuswire", "One list, sorted by what's due first, with the exact sentence each came from."],
            [MailCheck, "Replies you owe", "When a professor or advisor is waiting on you, it doesn't get buried."],
            [Filter, "Noise filtered", "Promotions and newsletters are counted, then hidden."],
            [ShieldCheck, "Private by design", "Tokens are encrypted, AI only sees short trimmed excerpts, and you can delete everything in one click."],
          ].map(([Icon, title, body]) => {
            const I = Icon as typeof CalendarClock;
            return (
              <li key={title as string} className="flex gap-4 rounded-2xl border border-stone-200 bg-white p-5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-maroon-50 text-maroon-600">
                  <I className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-stone-900">{title as string}</p>
                  <p className="mt-0.5 text-sm text-stone-600">{body as string}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
