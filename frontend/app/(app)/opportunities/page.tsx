"use client";

import { ExternalLink, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ImportDialog } from "@/components/ImportDialog";
import { SendButton } from "@/components/SendButton";
import { ItemList } from "@/components/ItemRow";
import { PageHeader, Tabs } from "@/components/Page";
import { api, type Item } from "@/lib/api";
import { whenOf } from "@/lib/sections";
import { useStore } from "@/lib/store";
import { clock, daysBetween, longDate } from "@/lib/time";
import { useFocusItem } from "@/lib/useFocus";
import { JobsPanel } from "@/components/JobsPanel";
import { ApplicationsPanel } from "@/components/ApplicationsPanel";

type Tab = "jobs" | "applications" | "clubs" | "other";
type CampusEvent = { id: string; title: string; starts_at: string; all_day: boolean; location: string | null; url: string | null; groups: string[]; following: boolean };
type Group = { name: string; upcoming: number; following: boolean };

const JOB_WORDS = /\b(job|jobs|hiring|position|positions|employment|work-study|assistant|staff|counselor|worker|tutor|intern|internship|part-time|\$\d+)/i;

function isJob(i: Item): boolean {
  return i.source_ref.startsWith("jobs-") || JOB_WORDS.test(`${i.title} ${i.evidence}`) || i.sender === "Handshake";
}

function byDeadline(items: Item[]): Item[] {
  return [...items].sort((a, b) => (whenOf(a)?.getTime() ?? Infinity) - (whenOf(b)?.getTime() ?? Infinity));
}

function JobBoardLinks() {
  return (
    <section className="rounded-[22px] border border-line-soft bg-surface shadow-[0_18px_40px_-30px_rgba(60,0,20,0.4)] px-5 py-4">
      <h2 className="font-semibold text-ink">More jobs on and off campus</h2>
      <p className="mt-1 text-sm text-ink-muted">
        The Student Employment Office lists on-campus and nearby off-campus jobs, including work-study. UMass doesn&apos;t
        allow apps to read that board automatically, so it opens on their site.
      </p>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
        <a href="https://yes.umass.edu/portal/jobsearch" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-maroon-600 hover:underline">
          Student Employment job board <ExternalLink className="h-3 w-3" />
        </a>
        <a href="https://umass.joinhandshake.com/stu/postings" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-maroon-600 hover:underline">
          Handshake <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </section>
  );
}

function ClubsTab() {
  const { me, reload, reloadMe, setNotice } = useStore();
  const [events, setEvents] = useState<CampusEvent[] | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [q, setQ] = useState("");
  const [onlyFollowing, setOnlyFollowing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [flyer, setFlyer] = useState(false);

  const load = useCallback(async () => {
    const [ev, gr] = await Promise.all([api<CampusEvent[]>("/campus-events?days=21"), api<Group[]>("/groups")]);
    setEvents(ev);
    setGroups(gr);
  }, []);
  useEffect(() => { load().catch(() => setEvents([])); }, [load]);

  async function toggle(name: string, following: boolean) {
    setBusy(name);
    try {
      if (following) await api(`/groups/follow?name=${encodeURIComponent(name)}`, { method: "DELETE" });
      else {
        const r = await api<{ events_added: number }>(`/groups/follow?name=${encodeURIComponent(name)}`, { method: "POST" });
        setNotice(`Following ${name}. ${r.events_added} upcoming event${r.events_added === 1 ? "" : "s"} added to your schedule.`);
      }
      await Promise.all([load(), reloadMe()]);
      reload();
    } finally {
      setBusy(null);
    }
  }

  const now = new Date();
  const shown = useMemo(() => (events ?? []).filter((e) =>
    (!onlyFollowing || e.following) &&
    (!q || `${e.title} ${e.groups.join(" ")}`.toLowerCase().includes(q.toLowerCase()))), [events, q, onlyFollowing]);
  const byDay = useMemo(() => {
    const m = new Map<string, CampusEvent[]>();
    for (const e of shown) {
      const d = new Date(e.starts_at);
      const label = daysBetween(now, d) <= 0 ? "Today" : daysBetween(now, d) === 1 ? "Tomorrow" : longDate(d);
      m.set(label, [...(m.get(label) ?? []), e]);
    }
    return [...m.entries()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown]);
  const following = groups.filter((g) => g.following);

  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-ink-soft">Clubs and organizations you follow</h2>
          {!me.demo && <button onClick={() => setFlyer(true)} className="text-sm font-semibold text-maroon-600 hover:underline">Add a club flyer or Instagram post</button>}
        </div>
        {following.length === 0 ? (
          <p className="mt-2 text-[15px] text-ink-muted">Follow an organization below and its events land on your Home and Schedule.</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-2">
            {following.map((g) => (
              <li key={g.name} className="inline-flex items-center gap-2 rounded-full bg-maroon-50 px-3 py-1 text-sm text-maroon-800">
                {g.name}
                <button disabled={busy !== null} onClick={() => toggle(g.name, true)} aria-label={`Unfollow ${g.name}`} className="text-maroon-400 hover:text-maroon-800">×</button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[13px] text-ink-muted">
          Many clubs only post on Instagram, which doesn&apos;t let apps follow accounts for you. Screenshot a post and add it, and
          its meetings and deadlines show up here.
        </p>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search campus events and organizations"
              className="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-maroon-600" />
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={onlyFollowing} onChange={(e) => setOnlyFollowing(e.target.checked)} className="accent-maroon-600" />
            Only ones I follow
          </label>
        </div>
        {events === null ? <div className="h-40 animate-pulse rounded-xl bg-line-soft" /> : byDay.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-5 py-6 text-sm text-ink-muted">No campus events match.</p>
        ) : (
          <div className="space-y-6">
            {byDay.map(([day, list]) => (
              <div key={day}>
                <h3 className="mb-2 text-[15px] font-semibold text-ink-soft">{day}</h3>
                <ul className="divide-y divide-line-soft rounded-[22px] border border-line-soft bg-surface shadow-[0_18px_40px_-30px_rgba(60,0,20,0.4)]">
                  {list.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3">
                      <time className="w-16 shrink-0 text-sm tabular-nums text-ink-muted">{e.all_day ? "All day" : clock(new Date(e.starts_at))}</time>
                      <div className="min-w-0 flex-1">
                        <a href={e.url ?? undefined} target="_blank" rel="noreferrer" className="font-semibold text-ink hover:text-maroon-700">{e.title}</a>
                        <p className="text-[13px] text-ink-muted">{[e.location, e.groups.join(", ")].filter(Boolean).join(". ")}</p>
                      </div>
                      {e.groups.slice(0, 1).map((g) => {
                        const on = groups.find((x) => x.name === g)?.following ?? false;
                        return (
                          <button key={g} disabled={busy !== null || me.demo} onClick={() => toggle(g, on)}
                            className={`shrink-0 rounded-lg px-2.5 py-1 text-[13px] font-semibold disabled:opacity-40 ${on ? "bg-ink text-white" : "border border-line text-ink-soft hover:border-ink-faint"}`}>
                            {on ? "Following" : "Follow"}
                          </button>
                        );
                      })}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-[13px] text-ink-muted">From events.umass.edu, refreshed three times a day.</p>
      </section>

      {flyer && <ImportDialog only="flyer" onClose={() => setFlyer(false)} onImported={(m) => { setNotice(m); reload(); }} />}
    </div>
  );
}

export default function OpportunitiesPage() {
  const { items, me, setStatus } = useStore();
  const [tab, setTab] = useState<Tab>("jobs");
  useFocusItem(items !== null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "clubs" || t === "other" || t === "jobs" || t === "applications") setTab(t);
  }, []);

  const opps = useMemo(() => (items ?? []).filter((i) => i.category === "opportunity"), [items]);
  const followed = new Set(me.followed_groups);
  const clubOpps = opps.filter((i) => !isJob(i) && (i.source === "screenshot" || followed.has(i.sender)));
  const jobs = byDeadline(opps.filter(isJob));
  const other = byDeadline(opps.filter((i) => !isJob(i) && !clubOpps.includes(i)));

  return (
    <div className="max-w-3xl space-y-6 pb-16">
      <PageHeader title="Opportunities" subtitle="Jobs, clubs, campus events, research and programs." />
      <Tabs active={tab} onChange={(t) => setTab(t as Tab)} tabs={[
        { id: "jobs", label: "Jobs", count: jobs.length },
        { id: "applications", label: "Applications" },
        { id: "clubs", label: "Clubs and events" },
        { id: "other", label: "Research and more", count: other.length },
      ]} />
      {tab === "jobs" && (
        <div className="space-y-6">
          <JobsPanel />
          {!me.demo && <SendButton />}
          <JobBoardLinks />
        </div>
      )}
      {tab === "applications" && <ApplicationsPanel />}
      {tab === "clubs" && (
        <div className="space-y-8">
          {clubOpps.length > 0 && <ItemList title="Club applications and sign-ups" items={byDeadline(clubOpps)} onStatus={setStatus} />}
          <ClubsTab />
        </div>
      )}
      {tab === "other" && (
        <ItemList items={other} onStatus={setStatus} empty="Research positions, programs and other openings from your email show up here." />
      )}
    </div>
  );
}
