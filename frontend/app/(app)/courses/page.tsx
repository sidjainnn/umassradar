"use client";

import { FileCheck2, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ImportDialog } from "@/components/ImportDialog";
import { PageHeader } from "@/components/Page";
import { api, type CourseSummary } from "@/lib/api";
import { useStore } from "@/lib/store";

function CourseRow({ c, onAddSyllabus }: { c: CourseSummary; onAddSyllabus?: (code: string) => void }) {
  return (
    <li className="flex items-center gap-4 px-5 py-3.5">
      <Link href={`/courses/${encodeURIComponent(c.code)}`} className="min-w-0 flex-1 hover:text-maroon-700">
        <span className="block">
          <span className="font-semibold text-ink">{c.code}</span>
          <span className="ml-2 text-ink-soft">{c.title}</span>
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-ink-muted">
          {[c.instructors.slice(0, 2).join(", ") || "Instructor not listed", c.term, c.credits && `${c.credits} credits`].filter(Boolean).join(", ")}
        </span>
      </Link>
      {c.has_syllabus ? (
        <span className="hidden shrink-0 items-center gap-1 text-[13px] text-forest sm:inline-flex">
          <FileCheck2 className="h-3.5 w-3.5" /> Syllabus
        </span>
      ) : onAddSyllabus ? (
        <button onClick={() => onAddSyllabus(c.code)} className="shrink-0 text-[13px] font-semibold text-maroon-600 hover:underline">
          Add syllabus
        </button>
      ) : null}
    </li>
  );
}

function Group({ title, hint, courses, onAddSyllabus }: { title: string; hint?: string; courses: CourseSummary[]; onAddSyllabus?: (code: string) => void }) {
  if (courses.length === 0) return null;
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <h2 className="text-[15px] font-semibold text-ink-soft">{title}</h2>
        {hint && <span className="text-[13px] text-ink-faint">{hint}</span>}
      </div>
      <ul className="divide-y divide-line-soft rounded-xl border border-line bg-surface">
        {courses.map((c) => <CourseRow key={c.code} c={c} onAddSyllabus={onAddSyllabus} />)}
      </ul>
    </section>
  );
}

export default function CoursesPage() {
  const { me, setNotice } = useStore();
  const [list, setList] = useState<CourseSummary[] | null>(null);
  const [q, setQ] = useState("");
  const [total, setTotal] = useState<number | null>(null);
  const [syllabusFor, setSyllabusFor] = useState<string | null>(null);

  const load = (query: string) =>
    api<CourseSummary[]>(`/courses?q=${encodeURIComponent(query)}`).then(setList).catch(() => setList([]));

  useEffect(() => {
    api<{ courses: number }>("/courses-count").then((r) => setTotal(r.courses)).catch(() => {});
  }, []);
  useEffect(() => {
    const t = setTimeout(() => load(q), 200);
    return () => clearTimeout(t);
  }, [q]);

  const groups = useMemo(() => {
    const all = list ?? [];
    return { mine: all.filter((c) => c.mine), plan: all.filter((c) => c.planned && !c.mine), rest: all.filter((c) => !c.mine && !c.planned) };
  }, [list]);

  return (
    <div className="max-w-3xl space-y-8 pb-16">
      <PageHeader title="Courses" subtitle="Every UMass course with its sections, plus office hours, exams and grading from recent syllabi." />

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={total ? `Search ${total.toLocaleString()} courses by code, title or instructor` : "Search courses by code, title or instructor"}
          className="w-full rounded-xl border border-line bg-surface py-3 pl-10 pr-4 text-[15px] outline-none placeholder:text-ink-faint focus:border-maroon-600"
        />
      </label>

      {list === null ? (
        <div className="h-40 animate-pulse rounded-xl bg-line-soft" />
      ) : q ? (
        list.length === 0 ? (
          <p className="text-[15px] text-ink-muted">No courses match “{q}”. Try a code like STAT 240 or part of a title.</p>
        ) : (
          <Group title={`${list.length === 60 ? "Top 60" : list.length} result${list.length === 1 ? "" : "s"}`} courses={list} />
        )
      ) : (
        <>
          <Group title="Your courses" hint="From your schedule and email" courses={groups.mine} onAddSyllabus={me.demo ? undefined : setSyllabusFor} />
          <Group title="Your plan" hint="Courses you're considering" courses={groups.plan} />
          {groups.mine.length === 0 && groups.plan.length === 0 && (
            <p className="rounded-xl border border-dashed border-line px-5 py-6 text-[15px] text-ink-muted">
              Your courses show up here once you <Link href="/schedule" className="font-semibold text-maroon-600 hover:underline">add your schedule</Link>.
              Search above to look up any course.
            </p>
          )}
        </>
      )}

      {syllabusFor && (
        <ImportDialog
          only="syllabus"
          extraQuery={`?expected_course=${encodeURIComponent(syllabusFor)}`}
          onClose={() => setSyllabusFor(null)}
          onImported={(m) => { setNotice(m); load(q); }}
        />
      )}
    </div>
  );
}
