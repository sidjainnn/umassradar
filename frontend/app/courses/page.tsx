"use client";

import { BookOpen, FileCheck2, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { api, ApiError, type CourseSummary } from "@/lib/api";

export default function CoursesPage() {
  const [all, setAll] = useState<CourseSummary[] | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      api<CourseSummary[]>(`/courses?q=${encodeURIComponent(q)}`)
        .then(setAll)
        .catch((e) => setError(e instanceof ApiError && e.status === 401 ? "Sign in on the dashboard to browse courses." : String(e)));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const groups = useMemo(() => {
    const list = all ?? [];
    return [
      { title: "Your courses", hint: "From your email, Canvas and syllabi", items: list.filter((c) => c.mine) },
      { title: "In your plan", hint: "Courses you're considering", items: list.filter((c) => c.planned && !c.mine) },
      { title: q ? "Results" : "All CICS courses", hint: "From the CICS catalog", items: list.filter((c) => !c.mine && !c.planned) },
    ].filter((g) => g.items.length > 0);
  }, [all, q]);

  return (
    <div className="min-h-screen">
      <NavBar active="courses" />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
        <p className="mt-1 text-sm text-stone-500">
          Every CICS course with its sections, plus office hours, exam dates and grading shared from students&apos; syllabi.
        </p>
        <label className="relative mt-5 block max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by code, title, topic or instructor…"
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-maroon-500 focus:ring-2 focus:ring-maroon-100"
          />
        </label>
        {error && <p className="mt-6 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
        {all === null && !error && <p className="mt-8 text-sm text-stone-400">Loading courses…</p>}
        {all?.length === 0 && <p className="mt-8 text-sm text-stone-400">No courses match “{q}”.</p>}
        {groups.map((g) => (
          <section key={g.title} className="mt-8">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
                {g.title} <span className="ml-1 text-stone-400">{g.items.length}</span>
              </h2>
              <span className="text-xs text-stone-400">{g.hint}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((c) => (
                <Link
                  key={c.code}
                  href={`/courses/${encodeURIComponent(c.code)}`}
                  className="rounded-xl border border-stone-200 bg-white p-4 transition hover:border-maroon-500 hover:shadow-md"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="rounded-full bg-stone-900 px-2 py-0.5 font-medium text-white">{c.code}</span>
                    <span className="text-stone-400">{[c.term, c.credits && `${c.credits} cr`].filter(Boolean).join(" · ")}</span>
                  </div>
                  <p className="mt-2 font-semibold leading-snug text-stone-900">{c.title}</p>
                  <p className="mt-1 truncate text-sm text-stone-500">{c.instructors.join(", ") || "Instructor TBA"}</p>
                  <div className="mt-2 flex gap-3 text-xs">
                    {c.has_syllabus && (
                      <span className="inline-flex items-center gap-1 text-emerald-700"><FileCheck2 className="h-3.5 w-3.5" /> Syllabus info</span>
                    )}
                    {c.mine && <span className="inline-flex items-center gap-1 text-maroon-600"><BookOpen className="h-3.5 w-3.5" /> Taking it</span>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
