"use client";

import { ArrowUp, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatWhen } from "@/lib/time";
import { Minuteman } from "./mascot/Minuteman";

type Cited = { id: string; title: string; course: string | null; when: string | null; category: string };
type Navigate = { to: string; course?: string; label: string; summary?: string };
type Msg = { role: "student" | "sam"; text: string; items?: Cited[]; courses?: string[]; navigate?: Navigate[]; error?: boolean };

const SUGGESTIONS = ["Where is my ECE 122 class?", "What's due this week?", "Who am I waiting to reply to?", "When can I go to office hours?", "Do I need to buy any textbooks?"];

/** A floating Sam who answers questions about your deadlines, schedule and courses. */
export function AskSam() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [thinking, setThinking] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, thinking]);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const returnFocus = launcher.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key !== "Tab") return;
      const controls = dialog.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); returnFocus?.focus(); };
  }, [open]);

  async function send(text: string) {
    const question = text.trim();
    if (question.length < 2 || question.length > 500 || thinking) return;
    const history = msgs.filter((m) => !m.error).slice(-6).map((m) => ({ role: m.role, text: m.text.slice(0, 2000) }));
    setMsgs((m) => [...m, { role: "student", text: question }]);
    setQ("");
    setThinking(true);
    try {
      const r = await api<{ answer: string; items: Cited[]; courses: string[]; navigate?: Navigate[] }>("/ask", { method: "POST", body: JSON.stringify({ question, history }) });
      if (typeof r.answer !== "string") throw new Error("Sam couldn't answer right now. Please try again.");
      setMsgs((m) => [...m, { role: "sam", text: r.answer, items: r.items, courses: r.courses, navigate: r.navigate }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: "sam", text: e instanceof ApiError && e.status === 503 ? "Sam isn't available right now. Your to-do list, courses and classroom directions still work." : e instanceof Error ? e.message : "Sam couldn't answer right now.", error: true }]);
    } finally {
      setThinking(false);
    }
  }

  return (
    <>
      <button ref={launcher} onClick={() => setOpen(true)} aria-label="Ask Sam" aria-expanded={open}
        className={`fixed bottom-[84px] right-3 z-40 flex items-center gap-1 rounded-full bg-white py-1 pl-1 pr-4 shadow-[0_18px_40px_-16px_rgba(60,0,20,0.55)] ring-1 ring-maroon-100 transition hover:-translate-y-0.5 lg:bottom-6 lg:right-6 ${open ? "pointer-events-none opacity-0" : ""}`}>
        <span className="mode-soft-panel grid h-12 w-12 place-items-center overflow-hidden rounded-full">
          <Minuteman size={40} watch={false} className="mt-3" />
        </span>
        <span className="font-display text-[15px] font-extrabold tracking-[-0.02em] text-maroon-700">Ask Sam</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-ink/20 p-0 sm:p-6" onClick={() => setOpen(false)}>
          <section ref={dialog} role="dialog" aria-modal="true" aria-label="Ask Sam" onClick={(e) => e.stopPropagation()}
            className="rise flex h-[85vh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:h-[640px] sm:max-w-[420px] sm:rounded-[28px]">
            <header className="mode-soft-panel relative flex items-center gap-3 px-5 pb-3 pt-4">
              <Minuteman size={52} greet />
              <div className="flex-1">
                <p className="font-display text-[19px] font-extrabold tracking-[-0.03em]">Ask Sam</p>
                <p className="text-[13px] text-ink-muted">Answers from your email, schedule and syllabi</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-full p-1.5 text-ink-muted hover:bg-white"><X className="h-5 w-5" /></button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {msgs.length === 0 && (
                <div className="space-y-2">
                  <p className="px-1 text-sm text-ink-muted">Try one of these:</p>
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="block w-full rounded-2xl bg-paper px-4 py-2.5 text-left text-[15px] text-ink hover:bg-maroon-50">{s}</button>
                  ))}
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={m.role === "student" ? "flex justify-end" : ""}>
                  <div className={`max-w-[88%] whitespace-pre-line rounded-[20px] px-4 py-2.5 text-[15px] leading-relaxed ${m.role === "student" ? "rounded-br-md bg-maroon-600 text-white" : "rounded-bl-md bg-paper text-ink"}`}>
                    {m.text}
                    {!!m.navigate?.length && <div className="mt-3 space-y-2">{m.navigate.map((n) => <div key={n.to}>
                      {n.summary && <p className="mb-1 text-xs text-ink-muted">{n.summary}</p>}
                      <a href={`/map?room=${encodeURIComponent(n.to)}`} onClick={() => setOpen(false)} className="inline-flex rounded-full bg-maroon-600 px-3 py-2 text-xs font-semibold text-white">{n.label || "Take me there"} ↗</a>
                    </div>)}</div>}
                    {(!!m.items?.length || !!m.courses?.length) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.items?.map((it) => (
                          <Link key={it.id} href={`/search?q=${encodeURIComponent(it.title)}`} onClick={() => setOpen(false)}
                            className="rounded-full bg-white px-2.5 py-1 text-[12.5px] font-semibold text-maroon-700 ring-1 ring-maroon-100 hover:bg-maroon-50">
                            {it.title}{it.when ? `, ${formatWhen(it.when)}` : ""}
                          </Link>
                        ))}
                        {m.courses?.map((c) => (
                          <Link key={c} href={`/courses/${encodeURIComponent(c)}`} onClick={() => setOpen(false)}
                            className="rounded-full bg-white px-2.5 py-1 text-[12.5px] font-semibold text-ink-soft ring-1 ring-line hover:bg-paper">{c}</Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex items-center gap-1.5 px-2 text-ink-faint" aria-label="Sam is thinking">
                  {[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-maroon-200" style={{ animationDelay: `${d * 120}ms` }} />)}
                </div>
              )}
              <div ref={end} />
            </div>

            <form onSubmit={(e) => { e.preventDefault(); send(q); }} className="flex items-center gap-2 border-t border-line-soft p-3">
              <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Message Sam" placeholder="Ask about deadlines, classes, textbooks…" maxLength={500}
                className="min-w-0 flex-1 rounded-full bg-paper px-4 py-2.5 text-[15px] outline-none focus-visible:outline-none focus:ring-2 focus:ring-maroon-200" />
              <button type="submit" disabled={q.trim().length < 2 || thinking} aria-label="Send"
                className="grid h-10 w-10 place-items-center rounded-full bg-maroon-600 text-white disabled:opacity-40"><ArrowUp className="h-5 w-5" /></button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
