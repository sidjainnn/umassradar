"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { formatWhen } from "@/lib/time";

type Answer = { answer: string; items: { id: string; title: string; course: string | null; when: string | null; category: string }[]; courses: string[] };
type Turn = { role: "student" | "sam"; text: string };

export function AskSam() {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = question.trim();
    if (text.length < 2 || busy) return;
    setBusy(true); setError("");
    try {
      const result = await api<Answer>("/ask", { method: "POST", body: JSON.stringify({ question: text, history: turns.slice(-6) }) });
      if (typeof result.answer !== "string" || !Array.isArray(result.items) || !Array.isArray(result.courses)) throw new Error("Sam is temporarily unavailable. Please try again.");
      setAnswer(result); setTurns([...turns, { role: "student", text }, { role: "sam", text: result.answer }].slice(-6) as Turn[]); setQuestion("");
    } catch (e) { setError(e instanceof Error && !e.message.includes("GEMINI_API_KEY") ? e.message : "Sam isn’t available right now. Your deadlines and courses are still available below."); }
    finally { setBusy(false); }
  }
  return <section id="ask-sam" className="dashboard-card scroll-mt-32 p-5" aria-labelledby="ask-sam-heading">
    <div className="flex items-center justify-between gap-3"><div><p className="section-kicker">A little help from Sam</p><h2 id="ask-sam-heading" className="mt-1 font-serif text-xl font-semibold">Ask Sam</h2></div>{turns.length > 0 && <button onClick={() => { setTurns([]); setAnswer(null); setError(""); }} disabled={busy} className="text-xs font-semibold text-maroon-600">Clear chat</button>}</div>
    <p className="mt-2 text-sm text-ink-muted">Ask about your deadlines, schedule or syllabus. Sam answers from your connected student data.</p>
    <form onSubmit={send} className="mt-4 space-y-3"><label className="block text-xs font-semibold text-ink-muted">Your question<textarea value={question} onChange={(e) => setQuestion(e.target.value)} required minLength={2} maxLength={500} rows={3} placeholder="What’s due this week?" className="mt-1 block w-full resize-y rounded-xl border border-line bg-white p-3 text-sm font-normal" /></label><button disabled={busy || question.trim().length < 2} className="min-h-11 rounded-xl bg-maroon-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Sam is thinking…" : "Ask Sam"}</button></form>
    {error && <p role="alert" className="mt-3 text-sm text-maroon-700">{error}</p>}
    {answer && <div aria-live="polite" className="mt-4 border-t border-line pt-4"><p className="mb-2 text-xs font-semibold text-ink-muted">{turns.at(-2)?.text}</p><p className="whitespace-pre-wrap text-sm leading-relaxed">{answer.answer}</p><ul className="mt-3 space-y-2">{answer.items.map((item) => <li key={item.id}><Link href={`${item.category === "opportunity" ? "/opportunities" : ["course_info", "status_update"].includes(item.category) ? "/updates" : "/todo"}?focus=${encodeURIComponent(item.id)}`} className="block rounded-lg bg-maroon-50 p-2 text-xs font-semibold text-maroon-700 hover:underline">{item.title}{item.when ? ` · ${formatWhen(item.when)}` : ""}</Link></li>)}</ul><div className="mt-2 flex flex-wrap gap-2">{answer.courses.map((course) => <Link key={course} href={`/courses/${encodeURIComponent(course)}`} className="text-xs font-semibold text-maroon-600 underline">{course}</Link>)}</div></div>}
  </section>;
}
