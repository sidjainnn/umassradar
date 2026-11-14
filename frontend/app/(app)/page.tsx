"use client";

import { ArrowRight, CalendarDays, MailCheck, Sparkles } from "lucide-react";
import Image from "next/image";
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
    <div className="home-page pb-16">
      <section className="morning-hero relative overflow-hidden rounded-[24px] border border-maroon-100 px-5 py-6 sm:px-8 sm:py-7" aria-labelledby="morning-title">
        <div className="relative z-10 max-w-[720px] pr-0 sm:pr-28">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-maroon-600"><Sparkles className="h-4 w-4" /> Your morning brief</p>
          <h1 id="morning-title" className="mt-2 font-serif text-[30px] font-semibold leading-tight text-ink sm:text-[38px]">
            {greeting(now)}{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{longDate(now)} · Here is what needs your attention.</p>
          <div className="mt-5"><BriefText brief={brief} items={list} /></div>
        </div>
        <Image className="morning-sam hidden sm:block" src="/mascots/sam-minuteman-3d.png" alt="Sam the Minuteman" width={210} height={250} priority />
      </section>

      <section className="week-pulse mt-4 grid overflow-hidden rounded-2xl bg-ink text-white sm:grid-cols-[1fr_auto]" aria-label="This week at a glance">
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10"><MailCheck className="h-5 w-5" /></span>
          <div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">Inbox distilled</p><p className="mt-0.5 text-sm font-semibold">{glance[0].n} due this week · {glance[1].n} replies waiting · {noise.length} distractions filtered</p></div>
        </div>
        <Link href="/todo" className="flex items-center justify-center gap-2 border-t border-white/10 bg-maroon-600 px-6 py-4 text-sm font-bold hover:bg-maroon-500 sm:border-l sm:border-t-0">Open plan <ArrowRight className="h-4 w-4" /></Link>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,.85fr)]">
        <div className="space-y-6">
          <section className="dashboard-card" aria-labelledby="today-h">
            <div className="flex items-start justify-between gap-3 border-b border-line-soft px-5 py-4 sm:px-6">
              <div><p className="section-kicker">Your timeline</p><h2 id="today-h" className="mt-0.5 font-serif text-xl font-semibold text-ink">Today</h2></div>
              <Link href="/schedule" className="inline-flex items-center gap-1.5 rounded-lg bg-paper px-3 py-2 text-xs font-bold text-ink-soft hover:bg-maroon-50 hover:text-maroon-700"><CalendarDays className="h-4 w-4" /> Full schedule</Link>
            </div>
            {!schedule && !me.demo && <p className="mx-5 mt-4 rounded-xl bg-maroon-50 px-4 py-3 text-sm text-ink-muted sm:mx-6">Add your class schedule to complete this timeline. <Link href="/schedule" className="font-semibold text-maroon-600 hover:underline">Add schedule</Link></p>}
            <div className="px-4 py-4 sm:px-6">{items === null ? <div className="h-24 animate-pulse rounded-xl bg-line-soft" /> : <TodayLine entries={today} now={now} />}</div>
          </section>

          <section className="dashboard-card" aria-labelledby="next-h">
            <div className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-4 sm:px-6"><div><p className="section-kicker">Next actions</p><h2 id="next-h" className="mt-0.5 font-serif text-xl font-semibold text-ink">Coming up</h2></div><Link href="/todo" className="text-sm font-bold text-maroon-600 hover:underline">View all</Link></div>
            <div className="p-3 sm:p-4"><ItemList items={nextUp} onStatus={setStatus} empty="You're caught up. Nothing else needs you right now." /></div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="dashboard-card" aria-label="At a glance">
            <div className="border-b border-line-soft px-5 py-4"><p className="section-kicker">Live overview</p><h2 className="mt-0.5 font-serif text-xl font-semibold text-ink">Your week</h2></div>
            <div className="glance-grid grid grid-cols-2 gap-px overflow-hidden rounded-b-[20px] bg-line">
          {glance.map((g) => (
            <Link key={g.href} href={g.href} className="min-h-32 bg-surface px-4 py-5 hover:bg-maroon-50">
              <span className="block font-serif text-3xl font-semibold tabular-nums text-ink">{g.n}</span>
              <span className="mt-1 block text-[13px] leading-snug text-ink-muted">{g.label}</span>
            </Link>
          ))}
            </div>
          </section>

      {nextOffice.length > 0 && (
        <section className="dashboard-card" aria-labelledby="oh-h">
          <div className="border-b border-line-soft px-5 py-4"><p className="section-kicker">Good fit</p><h2 id="oh-h" className="mt-0.5 font-serif text-xl font-semibold text-ink">Office hours</h2></div>
          <ul className="divide-y divide-line-soft">
            {nextOffice.map((o) => (
              <li key={o.starts_at + o.who} className="px-5 py-4">
                <span>
                  <span className="block font-semibold text-ink">{o.who}</span>
                  <span className="mt-1 block text-sm text-ink-muted">{[o.course, o.location].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="mt-2 block text-xs font-semibold text-maroon-600">{formatWhen(o.starts_at)} to {clock(new Date(o.ends_at))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
        </aside>
      </div>
    </div>
  );
}
