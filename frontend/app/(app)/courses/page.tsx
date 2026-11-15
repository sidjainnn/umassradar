"use client";

import { FileCheck2, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ImportDialog } from "@/components/ImportDialog";
import { GROUP_LABEL, groupOf, type Material, type MaterialGroup, MaterialRow } from "@/components/Materials";
import { PageHeader, Tabs } from "@/components/Page";
import { Minuteman } from "@/components/mascot/Minuteman";
import { api, type CourseSummary } from "@/lib/api";
import { useStore } from "@/lib/store";
import { ClassLocations } from "@/components/ClassLocations";

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
      <ul className="divide-y divide-line-soft rounded-[22px] border border-line-soft bg-surface shadow-[0_18px_40px_-30px_rgba(60,0,20,0.4)]">
        {courses.map((c) => <CourseRow key={c.code} c={c} onAddSyllabus={onAddSyllabus} />)}
      </ul>
    </section>
  );
}

type TextbookCourse = CourseSummary & { materials: Material[]; syllabus_term: string | null; source_url: string | null };

function Textbooks() {
  const [rows, setRows] = useState<TextbookCourse[] | null>(null);
  useEffect(() => { api<TextbookCourse[]>("/textbooks").then(setRows).catch(() => setRows([])); }, []);
  if (rows === null) return <div className="h-40 animate-pulse rounded-[22px] bg-line-soft" />;
  const order: MaterialGroup[] = ["code", "buy", "optional", "none"];
  const grouped = Object.fromEntries(order.map((g) => [g, [] as { m: Material; course: string }[]])) as Record<MaterialGroup, { m: Material; course: string }[]>;
  for (const r of rows) for (const m of r.materials) grouped[groupOf(m)].push({ m, course: r.code });
  const missing = rows.filter((r) => r.materials.length === 0);
  const total = order.reduce((n, g) => n + grouped[g].length, 0);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-[24px] bg-white p-5 ring-1 ring-line-soft">
        <Minuteman size={56} />
        <p className="text-[15px] text-ink-soft">
          {total === 0
            ? "None of your courses' syllabi list textbooks yet. Add a syllabus and its books and access codes show up here."
            : <>From your syllabi: <b className="text-ink">{grouped.code.length}</b> access code{grouped.code.length === 1 ? "" : "s"}, <b className="text-ink">{grouped.buy.length}</b> required book{grouped.buy.length === 1 ? "" : "s"} and <b className="text-ink">{grouped.optional.length + grouped.none.length}</b> you can skip or get free. Check before you buy.</>}
        </p>
      </div>
      {order.filter((g) => grouped[g].length).map((g) => (
        <section key={g} className="rounded-[26px] p-5 sm:p-6" style={{ background: GROUP_LABEL[g].tint }}>
          <h2 className="font-display text-[20px] font-extrabold tracking-[-0.03em]" style={{ color: GROUP_LABEL[g].ink }}>{GROUP_LABEL[g].title}</h2>
          <p className="text-sm text-ink-muted">{GROUP_LABEL[g].hint}</p>
          <ul className="mt-3 divide-y divide-line-soft rounded-[20px] bg-white px-4">
            {grouped[g].map(({ m, course }) => <MaterialRow key={course + m.title} m={m} course={course} />)}
          </ul>
        </section>
      ))}
      {missing.length > 0 && (
        <p className="text-sm text-ink-muted">
          No syllabus with materials yet for {missing.map((r) => r.code).join(", ")}. Open a course and add its syllabus to fill this in.
        </p>
      )}
    </div>
  );
}

export default function CoursesPage() {
  const { me, setNotice } = useStore();
  const [list, setList] = useState<CourseSummary[] | null>(null);
  const [q, setQ] = useState("");
  const [total, setTotal] = useState<number | null>(null);
  const [syllabusFor, setSyllabusFor] = useState<string | null>(null);
  const [tab, setTab] = useState("mine");

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
      {!q && tab === "mine" && <ClassLocations />}

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={total ? `Search ${total.toLocaleString()} courses by code, title or instructor` : "Search courses by code, title or instructor"}
          className="w-full rounded-[22px] border border-line-soft bg-surface shadow-[0_18px_40px_-30px_rgba(60,0,20,0.4)] py-3 pl-10 pr-4 text-[15px] outline-none placeholder:text-ink-faint focus:border-maroon-600"
        />
      </label>

      {!q && <Tabs tabs={[{ id: "mine", label: "My courses" }, { id: "books", label: "Textbooks" }]} active={tab} onChange={setTab} />}

      {!q && tab === "books" ? (
        <Textbooks />
      ) : list === null ? (
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
