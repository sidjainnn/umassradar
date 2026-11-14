"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ItemList } from "@/components/ItemRow";
import { PageHeader } from "@/components/Page";
import { api, type CourseSummary, type Item } from "@/lib/api";
import { matchesSearch } from "@/lib/sections";
import { useStore } from "@/lib/store";

export default function SearchPage() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  );
}

function SearchResults() {
  const { setStatus } = useStore();
  const q = useSearchParams().get("q") ?? "";
  const [items, setItems] = useState<Item[] | null>(null);
  const [courses, setCourses] = useState<CourseSummary[]>([]);

  useEffect(() => {
    if (!q) return;
    api<Item[]>(`/items?status=all&q=${encodeURIComponent(q)}`).then(setItems).catch(() => setItems([]));
    api<CourseSummary[]>(`/courses?q=${encodeURIComponent(q)}`).then((c) => setCourses(c.slice(0, 6))).catch(() => setCourses([]));
  }, [q]);

  const results = useMemo(() => (items ?? []).filter((i) => matchesSearch(i, q)), [items, q]);

  return (
    <div className="max-w-3xl space-y-8 pb-16">
      <PageHeader title={q ? `Results for “${q}”` : "Search"} />
      {courses.length > 0 && (
        <section>
          <h2 className="mb-2 text-[15px] font-semibold text-ink-soft">Courses</h2>
          <ul className="divide-y divide-line-soft rounded-xl border border-line bg-surface">
            {courses.map((c) => (
              <li key={c.code}>
                <Link href={`/courses/${encodeURIComponent(c.code)}`} className="flex items-baseline gap-3 px-5 py-3 hover:bg-paper">
                  <span className="font-semibold text-ink">{c.code}</span>
                  <span className="truncate text-ink-soft">{c.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {items !== null && (
        <ItemList title="From your email and imports" items={results} onStatus={setStatus}
          empty={`Nothing in your email matches “${q}”. Try a course code like COMPSCI 220 or a name.`} />
      )}
    </div>
  );
}
