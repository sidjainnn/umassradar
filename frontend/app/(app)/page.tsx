"use client";

import { Briefcase, Inbox, ListChecks, MessageCircleReply } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { BriefText } from "@/components/BriefText";
import { ItemList } from "@/components/ItemRow";
import { TodayLine, todayEntries } from "@/components/TodayLine";
import { whenOf } from "@/lib/sections";
import { displayName } from "@/lib/api";
import { isJob } from "@/lib/mode";
import { useStore } from "@/lib/store";
import { clock, daysBetween, formatWhen, greeting, longDate } from "@/lib/time";
import { Minuteman } from "@/components/mascot/Minuteman";
import { GlossyIcon } from "@/components/GlossyIcon";
import { WeekProgress } from "@/components/WeekProgress";

const ACTIONABLE = ["deadline", "appointment", "reply_owed", "event", "opportunity"];

export default function Home() {
  const { me, items, noise, schedule, officeHours, brief, setStatus, mode } = useStore();
  const work = mode === "work";
  const now = new Date();
  const list = useMemo(() => items ?? [], [items]);

  const today = useMemo(() => todayEntries(list, schedule, officeHours), [list, schedule, officeHours]);
  const todayIds = new Set(today.map((e) => e.key));

  const nextUp = useMemo(
    () =>
      list
        .filter((i) => ACTIONABLE.includes(i.category) && !todayIds.has(i.id))
        .filter((i) => { const w = whenOf(i); return !w || w > now; })
        .filter((i) => !work || !isJob(i))
        .sort((a, b) => b.urgency_score - a.urgency_score)
        .slice(0, 3),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list, today, work],
  );
  const jobs = useMemo(
    () => list.filter(isJob).filter((i) => { const w = whenOf(i); return !w || w > now; })
      .sort((a, b) => b.urgency_score - a.urgency_score).slice(0, 5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list],
  );

  const within = (i: (typeof list)[number], days: number) => {
    const w = whenOf(i);
    return !!w && w > now && daysBetween(now, w) <= days;
  };
  const glance = [
    { icon: ListChecks, from: "#c23a5f", to: "#5c0019", href: "/todo", n: list.filter((i) => ["deadline", "appointment"].includes(i.category) && within(i, 7)).length, label: "due or scheduled this week" },
    { icon: MessageCircleReply, from: "#1d4f8f", to: "#002554", href: "/todo?tab=replies", n: list.filter((i) => i.category === "reply_owed").length, label: "replies people are waiting on" },
    { icon: Briefcase, from: "#5d8b52", to: "#2f4a29", href: "/opportunities", n: list.filter((i) => i.category === "opportunity").length, label: "opportunities open" },
    { icon: Inbox, from: "#18b6cc", to: "#007a8c", href: "/updates", n: list.filter((i) => ["course_info", "status_update"].includes(i.category)).length + noise.length, label: "updates, noise filtered out" },
  ];
  if (work) glance.unshift(...glance.splice(2, 1));
  const nextOffice = officeHours.filter((o) => o.can_make !== false && new Date(o.starts_at) > now).slice(0, 2);
  const firstName = me.demo ? "" : displayName(me);

  return (
    <div className="max-w-3xl pb-16">
      <div className="flex items-end gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-muted">{longDate(now)}{work ? " · Work mode" : ""}</p>
          <h1 className="mt-1 font-display text-[34px] font-extrabold tracking-[-0.03em] leading-tight text-ink">
            {greeting(now)}{firstName ? `, ${firstName}` : ""}.
          </h1>
        </div>
        <Minuteman size={72} className="-mb-2 shrink-0" />
      </div>

      <div className="mt-6">
        <BriefText brief={brief} items={list} />
      </div>

      {work && (
        <section className="mt-10" aria-labelledby="jobs-h">
          <h2 id="jobs-h" className="mb-3 font-display text-xl font-extrabold tracking-[-0.03em] text-ink">Jobs, shifts and applications</h2>
          <ItemList items={jobs} onStatus={setStatus} empty="No job emails or applications need you right now." />
          <Link href="/opportunities" className="mt-3 inline-block text-sm font-semibold text-maroon-600 hover:underline">See all jobs</Link>
        </section>
      )}

      <section className="mt-10" aria-label="Your week">
        <WeekProgress items={items} />
      </section>

      <section className="mt-12" aria-labelledby="today-h">
        <h2 id="today-h" className="font-display text-xl font-extrabold tracking-[-0.03em] text-ink">Today</h2>
        {!schedule && !me.demo && (
          <p className="mt-1 text-sm text-ink-muted">
            Add your class schedule to see your classes here.{" "}
            <Link href="/schedule" className="font-semibold text-maroon-600 hover:underline">Add schedule</Link>
          </p>
        )}
        <div className="mt-4">{items === null ? <div className="h-24 animate-pulse rounded-xl bg-line-soft" /> : <TodayLine entries={today} now={now} />}</div>
      </section>

      <section className="mt-12" aria-labelledby="next-h">
        <h2 id="next-h" className="mb-3 font-display text-xl font-extrabold tracking-[-0.03em] text-ink">{work ? "Classes and everything else" : "Coming up"}</h2>
        <ItemList items={nextUp} onStatus={setStatus} empty="You're caught up. Nothing else needs you right now." />
        <Link href="/todo" className="mt-3 inline-block text-sm font-semibold text-maroon-600 hover:underline">See everything to do</Link>
      </section>

      <section className="mt-12" aria-label="At a glance">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {glance.map((g) => (
            <Link key={g.href} href={g.href}
              className="group rounded-[24px] bg-white p-4 ring-1 ring-line-soft transition hover:-translate-y-1 hover:shadow-[0_24px_40px_-24px_rgba(60,0,20,0.45)]">
              <GlossyIcon icon={g.icon} from={g.from} to={g.to} size={40} />
              <span className="mt-3 block font-display text-3xl font-extrabold tracking-[-0.03em] tabular-nums text-ink">{g.n}</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">{g.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <Link href="/map" className="mt-6 flex items-center gap-4 rounded-[24px] bg-[linear-gradient(160deg,#eef4ec,#ffffff)] p-4 ring-1 ring-[#d7e6d3] transition hover:-translate-y-0.5 lg:hidden">
        <span className="text-3xl" aria-hidden>🗺️</span>
        <span className="flex-1">
          <span className="block font-display text-[17px] font-extrabold tracking-[-0.02em] text-[#2f4a29]">Explore Amherst</span>
          <span className="block text-sm text-ink-muted">Your class buildings, food, study spots and trails on one map</span>
        </span>
      </Link>

      {nextOffice.length > 0 && (
        <section className="mt-12" aria-labelledby="oh-h">
          <h2 id="oh-h" className="mb-3 font-display text-xl font-extrabold tracking-[-0.03em] text-ink">Office hours you can make</h2>
          <ul className="divide-y divide-line-soft rounded-[22px] border border-line-soft bg-surface shadow-[0_18px_40px_-30px_rgba(60,0,20,0.4)]">
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
