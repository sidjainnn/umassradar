"use client";

import { AlertTriangle, ArrowLeft, Check, Clock, ExternalLink, FileText, MapPin, Plus, Users } from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { ItemCard } from "@/components/ItemCard";
import { NavBar } from "@/components/NavBar";
import { api, ApiError, type CourseProfile, type Item, type Section } from "@/lib/api";
import { formatWhen } from "@/lib/time";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function hhmm(t: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${suffix}`;
}

export default function CoursePage({ params }: { params: Promise<{ code: string }> }) {
  const code = decodeURIComponent(use(params).code);
  const [course, setCourse] = useState<CourseProfile | null>(null);
  const [term, setTerm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const q = term ? `?term=${encodeURIComponent(term)}` : "";
      setCourse(await api<CourseProfile>(`/courses/${encodeURIComponent(code)}${q}`));
    } catch (e) {
      setError(e instanceof ApiError && e.status === 401 ? "Sign in on the dashboard first." : e instanceof Error ? e.message : String(e));
    }
  }, [code, term]);

  useEffect(() => {
    load();
  }, [load]);

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
    const next = s.chosen ? chosen.filter((n) => n !== s.class_number) : [...chosen, s.class_number];
    setPlan(next);
  }

  async function setItemStatus(id: string, status: Item["status"]) {
    await api(`/items/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  }

  if (error) {
    return (
      <div className="min-h-screen">
        <NavBar active="courses" />
        <p className="mx-auto mt-10 max-w-6xl px-6 text-sm text-stone-500">{error}</p>
      </div>
    );
  }
  if (!course) {
    return (
      <div className="min-h-screen">
        <NavBar active="courses" />
        <p className="mx-auto mt-10 max-w-6xl px-6 text-sm text-stone-400">Loading…</p>
      </div>
    );
  }

  const shared = course.shared;
  return (
    <div className="min-h-screen">
      <NavBar active="courses" />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
        <Link href="/courses" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900">
          <ArrowLeft className="h-4 w-4" /> All courses
        </Link>

        <section className="mt-4 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-stone-200 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-maroon-600 px-2.5 py-0.5 font-semibold text-white">{course.code}</span>
                {course.credits && <span className="text-stone-500">{course.credits} credits</span>}
                {course.mine && <span className="rounded-full bg-maroon-50 px-2 py-0.5 font-medium text-maroon-700">You&apos;re taking this</span>}
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">{course.title}</h1>
              <p className="mt-1 text-sm text-stone-500">{course.instructors.join(", ") || "Instructor TBA"}</p>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
              {course.terms.length > 1 && (
                <select
                  value={course.term ?? ""}
                  onChange={(e) => setTerm(e.target.value)}
                  className="min-h-11 min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-2 py-2 text-sm sm:flex-none"
                >
                  {course.terms.map((t) => <option key={t}>{t}</option>)}
                </select>
              )}
              <button
                disabled={saving}
                onClick={() => setPlan(course.planned ? null : [])}
                className={`inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-60 sm:flex-none ${
                  course.planned ? "border border-stone-200 bg-white text-stone-700" : "bg-maroon-600 text-white hover:bg-maroon-700"
                }`}
              >
                {course.planned ? <><Check className="h-4 w-4" /> In your plan</> : <><Plus className="h-4 w-4" /> Add to plan</>}
              </button>
            </div>
          </div>
          {course.description && <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-stone-700">{course.description}</p>}
          {course.prerequisites && <p className="mt-3 text-sm text-stone-500">{course.prerequisites}</p>}
          {course.catalog_url && (
            <a href={course.catalog_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-maroon-600 hover:underline">
              Official course catalog <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">
              Sections · {course.term}
            </h2>
            {course.sections.length === 0 ? (
              <p className="rounded-xl border border-dashed border-stone-200 p-5 text-sm text-stone-400">No sections listed for this term.</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                {course.sections.map((s) => (
                  <div key={s.class_number} className="flex flex-col items-stretch gap-3 border-b border-stone-100 px-4 py-3 last:border-0 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-900">
                        {s.section.replace(/^U\d\s*/, "")} <span className="font-normal text-stone-400">#{s.class_number}</span>
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-stone-600">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {s.days.length ? `${s.days.map((d) => DAYS[d]).join("/")} ${hhmm(s.start)}–${hhmm(s.end)}` : "TBA"}
                        </span>
                        {s.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{s.location}</span>}
                        {s.instructor && <span className="text-stone-400">{s.instructor}</span>}
                      </p>
                      {s.conflicts_with.length > 0 && (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                          <AlertTriangle className="h-3.5 w-3.5" /> Clashes with {s.conflicts_with.join(", ")} in your plan
                        </p>
                      )}
                    </div>
                    {course.planned && (
                      <button
                        disabled={saving}
                        onClick={() => toggleSection(s)}
                        className={`min-h-11 rounded-lg px-3 py-2 text-xs font-medium sm:min-h-0 sm:px-2.5 sm:py-1 ${s.chosen ? "bg-stone-900 text-white" : "border border-stone-200 text-stone-600 hover:border-stone-300"}`}
                      >
                        {s.chosen ? "Chosen" : "Choose"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!course.planned && course.sections.length > 0 && (
              <p className="mt-2 text-xs text-stone-400">Add the course to your plan to pick sections and check them against your other courses.</p>
            )}

            {course.your_items.length > 0 && (
              <>
                <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-stone-500">Your open items for this course</h2>
                <div className="grid gap-3">
                  {course.your_items.map((i) => <ItemCard key={i.id} item={i} onStatus={setItemStatus} />)}
                </div>
              </>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex flex-col items-start gap-1 text-sm font-semibold uppercase tracking-wider text-stone-500 sm:flex-row sm:items-center sm:justify-between">
              From the syllabus
              {shared.syllabus_uploads > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-normal normal-case tracking-normal text-stone-400">
                  <Users className="h-3.5 w-3.5" /> shared by {shared.syllabus_uploads} student{shared.syllabus_uploads === 1 ? "" : "s"}
                </span>
              )}
            </h2>
            {shared.syllabus_uploads === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-300 bg-white p-5 text-sm text-stone-500">
                <FileText className="mb-2 h-5 w-5 text-stone-400" />
                No one has shared this syllabus yet. Import yours from the dashboard (Import → Syllabus) and its office hours,
                exam dates and grading show up here for everyone. The file itself is never kept.
              </div>
            ) : (
              <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-5 text-sm">
                {shared.grading && <Fact label="Grading">{shared.grading}</Fact>}
                {shared.late_policy && <Fact label="Late work">{shared.late_policy}</Fact>}
                {shared.office_hours.length > 0 && (
                  <Fact label="Office hours">
                    <ul className="space-y-1">
                      {shared.office_hours.map((o, i) => (
                        <li key={i}>
                          <span className="font-medium text-stone-900">{o.who}</span> · {DAYS[o.weekday]} {hhmm(o.start)}–{hhmm(o.end)}
                          {o.location && <span className="text-stone-400"> · {o.location}</span>}
                        </li>
                      ))}
                    </ul>
                  </Fact>
                )}
                {shared.dates.length > 0 && (
                  <Fact label="Coming up">
                    <ul className="space-y-1">
                      {shared.dates.map((d, i) => (
                        <li key={i}>
                          <span className="font-medium text-stone-900">{d.title}</span> · {formatWhen(d.when)}
                          {d.location && <span className="text-stone-400"> · {d.location}</span>}
                        </li>
                      ))}
                    </ul>
                  </Fact>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">{label}</p>
      <div className="mt-1 text-stone-700">{children}</div>
    </div>
  );
}
