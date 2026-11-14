"use client";

import { useEffect, useMemo, useState } from "react";
import { ItemList } from "@/components/ItemRow";
import { PageHeader, Tabs } from "@/components/Page";
import { api, type Item } from "@/lib/api";
import { whenOf } from "@/lib/sections";
import { useStore } from "@/lib/store";
import { daysBetween, longDate } from "@/lib/time";
import { useFocusItem } from "@/lib/useFocus";

const TODO = ["deadline", "appointment", "reply_owed"];
type Tab = "today" | "week" | "later" | "replies" | "done";

function dayLabel(d: Date, now: Date): string {
  const diff = daysBetween(now, d);
  if (diff < 0) return "Overdue";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return longDate(d);
}

/** Group dated items under day headings, in date order. */
function byDay(items: Item[], now: Date): [string, Item[]][] {
  const groups = new Map<string, Item[]>();
  for (const i of [...items].sort((a, b) => whenOf(a)!.getTime() - whenOf(b)!.getTime())) {
    const label = dayLabel(whenOf(i)!, now);
    groups.set(label, [...(groups.get(label) ?? []), i]);
  }
  return [...groups.entries()];
}

export default function TodoPage() {
  const { items, setStatus } = useStore();
  const [tab, setTab] = useState<Tab>("today");
  const [done, setDone] = useState<Item[] | null>(null);
  const now = new Date();

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "replies") setTab("replies");
  }, []);
  useEffect(() => {
    if (tab === "done") api<Item[]>("/items?status=done").then(setDone).catch(() => setDone([]));
  }, [tab]);

  const todo = useMemo(() => (items ?? []).filter((i) => TODO.includes(i.category)), [items]);
  const dated = todo.filter((i) => whenOf(i) && i.category !== "reply_owed");
  const recentlyOverdue = (i: Item) => whenOf(i)! < now && daysBetween(whenOf(i)!, now) <= 2 && i.category === "deadline";
  const groups = {
    today: dated.filter((i) => recentlyOverdue(i) || (whenOf(i)! >= now && daysBetween(now, whenOf(i)!) === 0)),
    week: dated.filter((i) => whenOf(i)! >= now && daysBetween(now, whenOf(i)!) >= 1 && daysBetween(now, whenOf(i)!) <= 7),
    later: dated.filter((i) => whenOf(i)! >= now && daysBetween(now, whenOf(i)!) > 7),
    replies: todo.filter((i) => i.category === "reply_owed"),
  };
  useFocusItem(items !== null);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "today", label: "Today", count: groups.today.length },
    { id: "week", label: "This week", count: groups.week.length },
    { id: "later", label: "Later", count: groups.later.length },
    { id: "replies", label: "Replies owed", count: groups.replies.length },
    { id: "done", label: "Done" },
  ];

  return (
    <div className="max-w-3xl pb-16">
      <PageHeader title="To do" subtitle="Deadlines, appointments and people waiting on a reply." />
      <Tabs tabs={tabs} active={tab} onChange={(t) => setTab(t as Tab)} />
      <div className="mt-6 space-y-8">
        {items === null ? (
          <div className="h-40 animate-pulse rounded-xl bg-line-soft" />
        ) : tab === "done" ? (
          <ItemList items={done ?? []} onStatus={(id, s) => { setStatus(id, s); setDone((d) => d?.filter((i) => i.id !== id) ?? null); }}
            empty="Things you check off show up here." />
        ) : tab === "replies" ? (
          <ItemList items={groups.replies} onStatus={setStatus} empty="Nobody is waiting on you. Nice." />
        ) : groups[tab].length === 0 ? (
          <ItemList items={[]} onStatus={setStatus}
            empty={tab === "today" ? "Nothing due today." : tab === "week" ? "Nothing else due this week." : "Nothing scheduled further out yet."} />
        ) : (
          byDay(groups[tab], now).map(([label, list]) => (
            <ItemList key={label} title={label} items={list} onStatus={setStatus} showDate />
          ))
        )}
      </div>
    </div>
  );
}
