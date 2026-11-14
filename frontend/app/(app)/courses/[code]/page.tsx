"use client";

import { AlertTriangle, ArrowLeft, Check, ExternalLink, FileText, Plus } from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { ImportDialog } from "@/components/ImportDialog";
import { ItemList } from "@/components/ItemRow";
import { api, ApiError, type CourseProfile, type Item, type Section } from "@/lib/api";
import { useStore } from "@/lib/store";
import { formatWhen } from "@/lib/time";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function hhmm(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h >= 12 ? "PM" : "AM"}`;
}

function meets(s: Section): string {
  return s.days.length ? `${s.days.map((d) => DAYS[d]).join(", ")}, ${hhmm(s.start)} to ${hhmm(s.end)}` : "Time not listed";
}

export default function CoursePage({ params }: { params: Promise<{ code: string }> }) {
  const code = decodeURIComponent(use(params).code);
  const { me, setNotice } = useStore();
  const [course, setCourse] = useState<CourseProfile | null>(null);
  const [term, setTerm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [addingSyllabus, setAddingSyllabus] = useState(false);

  const load = useCallback(async () => {
    try {
      const q = term ? `?term=${encodeURIComponent(term)}` : "";
      setCourse(await api<CourseProfile>(`/courses/${encodeURIComponent(code)}${q}`));
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? `There's no page for ${code} yet.` : e instanceof Error ? e.message : String(e));
    }
  }, [code, term]);

  useEffect(() => { load(); }, [load]);

  async function setPlan(classNumbers: string[] | null) {
    setSaving(true);
    try {
      if (classNumbers === null) await api(`/plan/${encodeURIComponent(code)}`, { method: "DELETE" });
      else await api(`/plan/${encodeURIComponent(code)}`, { method: "PUT", body: JSON.stringify({ class_numbers: classNumbers }) });
      await load();
    } finally {
      setSaving(false);
    }
  }

  function toggleSection(s: Section) {
    if (!course) return;
    const chosen = course.sections.filter((x) => x.chosen).map((x) => x.class_number);
    setPlan(s.chosen ? chosen.filter((n) => n !== s.class_number) : [...chosen, s.class_number]);
  }

  async function setItemStatus(id: string, status: Item["status"]) {
    await api(`/items/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  }

  if (error) return <p className="text-[15px] text-ink-muted">{error} <Link href="/courses" className="font-semibold text-maroon-600 hover:underline">Back to courses</Link></p>;
  if (!course) return <div className="h-60 animate-pulse rounded-xl bg-line-soft" />;

  const shared = course.shared;
  const yours = course.sections.filter((s) => s.yours);

  return (
    <div className="pb-16">
      <Link href="/courses" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Courses
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[62ch]">
          <p className="text-[15px] font-semibold text-maroon-600">
            {course.code}
            {course.mine && <span className="ml-3 font-normal text-ink-muted">You&apos;re taking this</span>}
          </p>
          <h1 className="mt-1 font-serif text-[30px] font-semibold leading-tight text-ink">{course.title}</h1>
          <p className="mt-1 text-[15px] text-ink-muted">
            {[course.instructors.join(", ") || "Instructor not listed", course.credits && `${course.credits} credits`].filter(Boolean).join(", ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {course.terms.length > 1 && (
            <select value={course.term ?? ""} onChange={(e) => setTerm(e.target.value)} aria-label="Term"
              className="rounded-lg border border-line bg-surface px-2.5 py-2 text-sm">
              {course.terms.map((t) => <option key={t}>{t}</option>)}
            </select>
          )}
          <button disabled={saving} onClick={() => setPlan(course.planned ? null : [])}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60 ${
              course.planned ? "border border-line bg-surface text-ink-soft" : "bg-maroon-600 text-white hover:bg-maroon-700"}`}>
            {course.planned ? <><Check className="h-4 w-4" /> In your plan</> : <><Plus className="h-4 w-4" /> Add to plan</>}
          </button>
        </div>
      </header>

      {course.description && <p className="mt-5 max-w-[68ch] text-[15px] leading-relaxed text-ink-soft">{course.description}</p>}
      {course.prerequisites && <p className="mt-3 max-w-[68ch] text-sm text-ink-muted">{course.prerequisites}</p>}
      {course.catalog_url && (
        <a href={course.catalog_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-maroon-600 hover:underline">
          Catalog listing <ExternalLink className="h-3 w-3" />
        </a>
      )}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-10">
          <section>
            <h2 className="mb-2 text-[15px] font-semibold text-ink-soft">Sections in {course.term}</h2>
            {course.sections.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-5 py-5 text-sm text-ink-muted">No sections listed for this term.</p>
            ) : (
              <ul className="divide-y divide-line-soft rounded-xl border border-line bg-surface">
                {[...yours, ...course.sections.filter((s) => !s.yours)].map((s) => (
                  <li key={s.class_number} className={`flex items-center gap-4 px-5 py-3 ${s.yours ? "bg-maroon-50" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] text-ink">
                        <span className="font-semibold">{s.section.replace(/^U\d\s*/, "")}</span>
                        {s.yours && <span className="ml-2 text-[13px] font-semibold text-maroon-700">Your section</span>}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        {meets(s)}{s.location ? `, ${s.location}` : ""}{s.instructor ? `, ${s.instructor}` : ""}
                      </p>
                      {s.conflicts_with.length > 0 && (
                        <p className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-orange">
                          <AlertTriangle className="h-3.5 w-3.5" /> Clashes with {s.conflicts_with.join(" and ")}
                        </p>
                      )}
                    </div>
                    {course.planned && (
                      <button disabled={saving} onClick={() => toggleSection(s)}
                        className={`shrink-0 rounded-lg px-2.5 py-1 text-[13px] font-semibold ${s.chosen ? "bg-ink text-white" : "border border-line text-ink-soft hover:border-ink-faint"}`}>
                        {s.chosen ? "Picked" : "Pick"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!course.planned && course.sections.length > 0 && (
              <p className="mt-2 text-[13px] text-ink-muted">Add the course to your plan to pick sections and see clashes with your other classes.</p>
            )}
          </section>

          {course.your_items.length > 0 && (
            <ItemList title="Your open items for this course" items={course.your_items} onStatus={setItemStatus} />
          )}
        </div>

        <aside>
          <h2 className="mb-2 text-[15px] font-semibold text-ink-soft">From the syllabus</h2>
          {shared.syllabus_uploads === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-surface px-5 py-5">
              <FileText className="h-5 w-5 text-maroon-600" />
              <p className="mt-2 text-[15px] text-ink-soft">No recent syllabus for this course yet.</p>
              <p className="mt-1 text-sm text-ink-muted">Add yours and classmates get its office hours, exam dates and grading. The file itself isn&apos;t kept.</p>
              {!me.demo && (
                <button onClick={() => setAddingSyllabus(true)} className="mt-3 rounded-lg bg-maroon-600 px-3 py-2 text-sm font-semibold text-white hover:bg-maroon-700">
                  Add your syllabus
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-surface px-5 py-5 text-[15px]">
              <p className="text-[13px] text-ink-muted">
                From the {shared.term ?? "most recent"} syllabus
                {shared.source === "public" && shared.source_url ? (
                  <>, <a href={shared.source_url} target="_blank" rel="noreferrer" className="font-semibold text-maroon-600 hover:underline">see the original</a></>
                ) : `, shared by ${shared.syllabus_uploads === 1 ? "a student" : `${shared.syllabus_uploads} students`}`}
              </p>
              <dl className="mt-4 space-y-4">
                {shared.grading && <Fact label="Grading">{shared.grading}</Fact>}
                {shared.late_policy && <Fact label="Late work">{shared.late_policy}</Fact>}
                {shared.office_hours.length > 0 && (
                  <Fact label="Office hours">
                    <ul className="space-y-1">
                      {shared.office_hours.map((o, i) => (
                        <li key={i}><span className="font-semibold text-ink">{o.who}</span>, {DAYS[o.weekday]} {hhmm(o.start)} to {hhmm(o.end)}{o.location ? `, ${o.location}` : ""}</li>
                      ))}
                    </ul>
                  </Fact>
                )}
                {shared.dates.length > 0 && (
                  <Fact label="Coming up">
                    <ul className="space-y-1">
                      {shared.dates.map((d, i) => <li key={i}><span className="font-semibold text-ink">{d.title}</span>, {formatWhen(d.when)}</li>)}
                    </ul>
                  </Fact>
                )}
              </dl>
              {!me.demo && (
                <button onClick={() => setAddingSyllabus(true)} className="mt-5 text-sm font-semibold text-maroon-600 hover:underline">
                  Have this term&apos;s syllabus? Add it
                </button>
              )}
            </div>
          )}
        </aside>
      </div>

      {addingSyllabus && (
        <ImportDialog only="syllabus" extraQuery={`?expected_course=${encodeURIComponent(code)}`}
          onClose={() => setAddingSyllabus(false)} onImported={(m) => { setNotice(m); load(); }} />
      )}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] font-semibold text-ink-muted">{label}</dt>
      <dd className="mt-0.5 leading-relaxed text-ink-soft">{children}</dd>
    </div>
  );
}
