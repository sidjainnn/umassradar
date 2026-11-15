"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { api, ApiError } from "@/lib/api";

// Pages the "Send to UMass Radar" button may send from
const ALLOWED = ["yes.umass.edu", "careers.umass.edu", "umass.joinhandshake.com", "joinhandshake.com"];

type Payload = { type: "radar-page"; url: string; title: string; text: string };
type State =
  | { step: "waiting" }
  | { step: "signed-out" }
  | { step: "reading"; from: string }
  | { step: "done"; count: number; titles: string[] }
  | { step: "error"; message: string };

function allowedOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    return ALLOWED.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/** Small window opened by the bookmarklet. It receives the job board page from the student's own tab. */
export default function SendPage() {
  const [state, setState] = useState<State>({ step: "waiting" });
  const handled = useRef(false);

  useEffect(() => {
    api("/me").catch((e) => { if (e instanceof ApiError && e.status === 401) setState({ step: "signed-out" }); });

    const onMessage = async (e: MessageEvent) => {
      const data = e.data as Payload;
      if (!data || data.type !== "radar-page" || !allowedOrigin(e.origin)) return;
      (e.source as Window | null)?.postMessage("radar-got-it", e.origin);
      if (handled.current) return;
      handled.current = true;
      setState({ step: "reading", from: new URL(data.url).hostname });
      try {
        const r = await api<{ items: number; titles: string[] }>("/import/jobs-page", {
          method: "POST",
          body: JSON.stringify({ url: data.url, title: data.title, text: data.text }),
        });
        setState({ step: "done", count: r.items, titles: r.titles });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) setState({ step: "signed-out" });
        else setState({ step: "error", message: err instanceof Error ? err.message : String(err) });
      }
    };
    window.addEventListener("message", onMessage);
    const timeout = setTimeout(() => setState((s) => (s.step === "waiting" ? { step: "error", message: "Nothing arrived. Open the job board, run a search, then click the button again." } : s)), 15000);
    return () => { window.removeEventListener("message", onMessage); clearTimeout(timeout); };
  }, []);

  return (
    <main className="mx-auto max-w-md px-6 py-6">
      <Logo />
      <div className="mt-6 text-[15px] text-ink-soft">
        {state.step === "waiting" && <p>Waiting for the job board page…</p>}
        {state.step === "signed-out" && (
          <>
            <h1 className="font-display text-xl font-extrabold tracking-[-0.03em] text-ink">Sign in first</h1>
            <p className="mt-2">Open UMass Radar in this browser and sign in, then click the button on the job board again.</p>
            <a href="/" target="_blank" rel="noreferrer" className="mt-4 inline-block rounded-full bg-maroon-600 px-4 py-2 text-sm font-semibold text-white">Open UMass Radar</a>
          </>
        )}
        {state.step === "reading" && (
          <p role="status" className="flex items-center gap-2">
            <span className="h-2 w-2 animate-ping rounded-full bg-maroon-600" /> Reading the jobs on {state.from}…
          </p>
        )}
        {state.step === "done" && (
          <>
            <h1 className="font-display text-xl font-extrabold tracking-[-0.03em] text-ink">
              {state.count ? `Added ${state.count} job${state.count === 1 ? "" : "s"}` : "No jobs found on that page"}
            </h1>
            {state.count > 0 ? (
              <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto text-sm">
                {state.titles.map((t) => <li key={t} className="border-l-2 border-maroon-200 pl-2">{t}</li>)}
              </ul>
            ) : (
              <p className="mt-2">Run a search on the job board so the results are showing, then click the button again.</p>
            )}
            <div className="mt-5 flex gap-4 text-sm font-semibold">
              <a href="/opportunities?tab=jobs" target="_blank" rel="noreferrer" className="text-maroon-600 hover:underline">See them in UMass Radar</a>
              <button onClick={() => window.close()} className="text-ink-muted hover:text-ink">Close</button>
            </div>
          </>
        )}
        {state.step === "error" && (
          <>
            <h1 className="font-display text-xl font-extrabold tracking-[-0.03em] text-ink">That didn&apos;t work</h1>
            <p className="mt-2">{state.message}</p>
            <button onClick={() => window.close()} className="mt-4 text-sm font-semibold text-ink-muted hover:text-ink">Close</button>
          </>
        )}
      </div>
      <p className="mt-8 text-[12px] leading-snug text-ink-faint">Only the page you sent is read, once. UMass Radar keeps the job postings, not the page.</p>
    </main>
  );
}
