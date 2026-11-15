"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type CourseProfile } from "@/lib/api";

type Materials = { code: string; title: string; materials: NonNullable<CourseProfile["shared"]["materials"]>; has_syllabus: boolean; syllabus_term: string | null };

export function CourseMaterials() {
  const [courses, setCourses] = useState<Materials[]>([]);
  useEffect(() => {
    let current = true;
    api<Materials[]>("/textbooks").then((result) => {
      if (current && Array.isArray(result)) setCourses(result.filter((c) => c && typeof c.code === "string" && Array.isArray(c.materials)));
    }).catch(() => {});
    return () => { current = false; };
  }, []);
  if (!courses.length) return null;
  return <section className="dashboard-card p-5" aria-labelledby="materials-heading"><p className="section-kicker">From your syllabi</p><h2 id="materials-heading" className="mt-1 font-serif text-xl font-semibold">Textbooks & materials</h2><p className="mt-2 text-sm text-ink-muted">Check the syllabus term and confirm requirements before buying.</p><ul className="mt-4 divide-y divide-line">{courses.map((course) => <li key={course.code} className="py-4"><Link href={`/courses/${encodeURIComponent(course.code)}`} className="font-semibold text-maroon-600 hover:underline">{course.code}</Link>{course.syllabus_term && <span className="ml-2 text-xs text-ink-muted">{course.syllabus_term}</span>}{course.materials.length ? <ul className="mt-2 space-y-2">{course.materials.map((m, index) => <li key={index} className="text-sm"><span className="font-semibold">{m.title}</span><span className="ml-2 text-xs text-ink-muted">{m.required ? "Required" : "Optional / recommended"}{m.access_code ? " · Paid access code or subscription" : ""}</span>{m.note && <p className="text-xs text-ink-muted">{m.note}</p>}</li>)}</ul> : <p className="mt-2 text-xs text-ink-muted">{course.has_syllabus ? "No materials listed in the available syllabus facts." : "Add a syllabus to see the materials for this course."}</p>}</li>)}</ul></section>;
}
