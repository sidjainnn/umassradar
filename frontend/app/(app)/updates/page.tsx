"use client";

import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { ItemList } from "@/components/ItemRow";
import { PageHeader } from "@/components/Page";
import type { Item } from "@/lib/api";
import { useStore } from "@/lib/store";
import { useFocusItem } from "@/lib/useFocus";

export default function UpdatesPage() {
  const { items, noise, setStatus } = useStore();
  const [showNoise, setShowNoise] = useState(false);
  useFocusItem(items !== null);

  const byCourse = useMemo(() => {
    const updates = (items ?? [])
      .filter((i) => ["course_info", "status_update"].includes(i.category))
      .sort((a, b) => (b.received_at ?? "").localeCompare(a.received_at ?? ""));
    const groups = new Map<string, Item[]>();
    for (const u of updates) {
      const key = u.course ?? "Everything else";
      groups.set(key, [...(groups.get(key) ?? []), u]);
    }
    return [...groups.entries()].sort(([a], [b]) => (a === "Everything else" ? 1 : b === "Everything else" ? -1 : a.localeCompare(b)));
  }, [items]);

  return (
    <div className="max-w-3xl space-y-8 pb-16">
      <PageHeader title="Updates" subtitle="Course announcements, grades and application news. Nothing here needs action." />
      {items === null ? (
        <div className="h-40 animate-pulse rounded-xl bg-line-soft" />
      ) : byCourse.length === 0 ? (
        <ItemList items={[]} onStatus={setStatus} empty="No updates yet." />
      ) : (
        byCourse.map(([course, list]) => <ItemList key={course} title={course} items={list} onStatus={setStatus} showDate={false} />)
      )}

      <section className="rounded-[22px] border border-line-soft bg-surface shadow-[0_18px_40px_-30px_rgba(60,0,20,0.4)]">
        <button onClick={() => setShowNoise((s) => !s)} aria-expanded={showNoise}
          className="flex w-full items-center justify-between px-5 py-3.5 text-left text-[15px] text-ink-soft">
          <span><span className="font-semibold text-ink">{noise.length}</span> promotions and newsletters filtered out</span>
          <ChevronDown className={`h-4 w-4 transition ${showNoise ? "rotate-180" : ""}`} />
        </button>
        {showNoise && (
          <ul className="divide-y divide-line-soft border-t border-line-soft text-sm">
            {noise.map((n) => (
              <li key={n.id} className="flex justify-between gap-4 px-5 py-2.5 text-ink-muted">
                <span className="truncate">{n.title}</span>
                <span className="shrink-0 text-ink-faint">{n.sender}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
