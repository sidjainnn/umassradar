"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BriefText } from "@/components/BriefText";
import { ItemList } from "@/components/ItemRow";
import { TodayLine, todayEntries } from "@/components/TodayLine";
import { whenOf } from "@/lib/sections";
import { displayName } from "@/lib/api";
import { useStore } from "@/lib/store";
import { clock, daysBetween, formatWhen, greeting, longDate } from "@/lib/time";

const ACTIONABLE = ["deadline", "appointment", "reply_owed", "event", "opportunity"];

export default function Home() {
  const { me, items, noise, schedule, officeHours, brief, setStatus } = useStore();
  const now = new Date();
  const list = useMemo(() => items ?? [], [items]);

  const today = useMemo(() => todayEntries(list, schedule, officeHours), [list, schedule, officeHours]);
  const todayIds = new Set(today.map((e) => e.key));

  const nextUp = useMemo(
    () =>
      list
        .filter((i) => ACTIONABLE.includes(i.category) && !todayIds.has(i.id))
        .filter((i) => { const w = whenOf(i); return !w || w > now; })
        .sort((a, b) => b.urgency_score - a.urgency_score)
        .slice(0, 3),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list, today],
  );

  const within = (i: (typeof list)[number], days: number) => {
    const w = whenOf(i);
    return !!w && w > now && daysBetween(now, w) <= days;
  };
  const glance = [
    { href: "/todo", n: list.filter((i) => ["deadline", "appointment"].includes(i.category) && within(i, 7)).length, label: "due or scheduled this week" },
    { href: "/todo?tab=replies", n: list.filter((i) => i.category === "reply_owed").length, label: "replies people are waiting on" },
    { href: "/opportunities", n: list.filter((i) => i.category === "opportunity").length, label: "opportunities open" },
    { href: "/updates", n: list.filter((i) => ["course_info", "status_update"].includes(i.category)).length + noise.length, label: "updates, noise filtered out" },
  ];
  const nextOffice = officeHours.filter((o) => o.can_make !== false && new Date(o.starts_at) > now).slice(0, 2);
  const firstName = me.demo ? "" : displayName(me);

  return (
    <div className="home-page max-w-3xl pb-16">
      <p className="text-sm text-ink-muted">{longDate(now)}</p>
      <h1 className="mt-1 font-serif text-[34px] font-semibold leading-tight text-ink">
        {greeting(now)}{firstName ? `, ${firstName}` : ""}.
      </h1>

      <div className="mt-6">
        <BriefText brief={brief} items={list} />
      </div>

      <section className="mt-12" aria-labelledby="today-h">
        <h2 id="today-h" className="font-serif text-xl font-semibold text-ink">Today</h2>
        {!schedule && !me.demo && (
          <p className="mt-1 text-sm text-ink-muted">
            Add your class schedule to see your classes here.{" "}
            <Link href="/schedule" className="font-semibold text-maroon-600 hover:underline">Add schedule</Link>
          </p>
        )}
        <div className="mt-4">{items === null ? <div className="h-24 animate-pulse rounded-xl bg-line-soft" /> : <TodayLine entries={today} now={now} />}</div>
      </section>

      <section className="mt-12" aria-labelledby="next-h">
        <h2 id="next-h" className="mb-3 font-serif text-xl font-semibold text-ink">Coming up</h2>
        <ItemList items={nextUp} onStatus={setStatus} empty="You're caught up. Nothing else needs you right now." />
        <Link href="/todo" className="mt-3 inline-block text-sm font-semibold text-maroon-600 hover:underline">See everything to do</Link>
      </section>

      <section className="mt-12" aria-label="At a glance">
        <div className="glance-grid grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
          {glance.map((g) => (
            <Link key={g.href} href={g.href} className="bg-surface px-4 py-4 hover:bg-maroon-50">
              <span className="block font-serif text-3xl font-semibold tabular-nums text-ink">{g.n}</span>
              <span className="mt-1 block text-[13px] leading-snug text-ink-muted">{g.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {nextOffice.length > 0 && (
        <section className="mt-12" aria-labelledby="oh-h">
          <h2 id="oh-h" className="mb-3 font-serif text-xl font-semibold text-ink">Office hours you can make</h2>
          <ul className="divide-y divide-line-soft rounded-xl border border-line bg-surface">
            {nextOffice.map((o) => (
              <li key={o.starts_at + o.who} className="flex items-baseline justify-between gap-4 px-5 py-3.5">
                <span>
                  <span className="font-semibold text-ink">{o.who}</span>
                  {o.course && <span className="ml-2 text-sm font-semibold text-ink-soft">{o.course}</span>}
                  {o.location && <span className="ml-2 text-sm text-ink-muted">{o.location}</span>}
                </span>
                <span className="shrink-0 text-sm text-ink-muted">{formatWhen(o.starts_at)} to {clock(new Date(o.ends_at))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
