"use client";

import { ChevronDown, Inbox, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type Category, type Item, type Me, type OfficeHourSlot } from "@/lib/api";
import { CATEGORY_LABEL, groupItems, matchesSearch, SECTIONS } from "@/lib/sections";
import { Brief, type BriefData } from "./Brief";
import { Header } from "./Header";
import { ImportDialog } from "./ImportDialog";
import { ItemCard } from "./ItemCard";
import { OfficeHours } from "./OfficeHours";
import { SettingsDialog } from "./SettingsDialog";

type View = "open" | "done" | "dismissed";
const STALE_MS = 15 * 60 * 1000;
const FILTER_CATEGORIES: Category[] = ["deadline", "appointment", "reply_owed", "event", "opportunity", "status_update", "course_info"];

type Props = { me: Me; onSignedOut: () => void; onMeChanged: () => void };

export function Dashboard({ me, onSignedOut, onMeChanged }: Props) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [noise, setNoise] = useState<Item[]>([]);
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [view, setView] = useState<View>("open");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [course, setCourse] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showNoise, setShowNoise] = useState(false);
  const [settings, setSettings] = useState(false);
  const [importing, setImporting] = useState(false);
  const [officeHours, setOfficeHours] = useState<OfficeHourSlot[]>([]);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const load = useCallback(async (v: View = view) => {
    const [list, noiseList] = await Promise.all([
      api<Item[]>(`/items?status=${v}`),
      api<Item[]>("/items?status=open&category=noise"),
    ]);
    setItems(list);
    setNoise(noiseList);
    api<OfficeHourSlot[]>("/office-hours").then(setOfficeHours).catch(() => setOfficeHours([]));
    api<BriefData>("/brief").then(setBrief).catch(() => setBrief(null));
  }, [view]);

  const refresh = useCallback(async () => {
    setSyncing(true);
    try {
      const r = await api<{ status: string; message?: string; new_messages?: number }>("/sync", { method: "POST" });
      if (r.status !== "ok" && r.message) setNotice(r.message);
      onMeChanged();
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  }, [load, onMeChanged]);

  // Load now; auto-sync if the last sync is stale; re-render every minute so "in 2 h" stays true.
  useEffect(() => {
    load().catch((e) => setNotice(String(e)));
    const stale = !me.last_sync_at || Date.now() - new Date(me.last_sync_at).getTime() > STALE_MS;
    if (stale && !me.demo && !me.needs_reconnect) refresh();
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(id: string, status: Item["status"]) {
    setItems((prev) => prev?.filter((i) => i.id !== id) ?? null);
    await api(`/items/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    api<BriefData>("/brief").then(setBrief).catch(() => {});
  }

  function switchView(v: View) {
    setView(v);
    setItems(null);
    load(v);
  }

  function jumpTo(id: string) {
    setQuery("");
    setCategory(null);
    setCourse(null);
    setHighlight(id);
    setTimeout(() => document.getElementById(`item-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    setTimeout(() => setHighlight(null), 2500);
  }

  async function signOut() {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    onSignedOut();
  }

  const courses = useMemo(
    () => [...new Set((items ?? []).map((i) => i.course).filter(Boolean) as string[])].sort(),
    [items],
  );
  const filtered = useMemo(
    () =>
      (items ?? []).filter(
        (i) => matchesSearch(i, query) && (!category || i.category === category) && (!course || i.course === course),
      ),
    [items, query, category, course],
  );
  const searching = !!(query || category || course);
  const groups = useMemo(() => groupItems(filtered), [filtered]);

  return (
    <div className="min-h-screen">
      <Header
        me={me}
        query={query}
        onQuery={setQuery}
        syncing={syncing}
        onRefresh={refresh}
        onSettings={() => setSettings(true)}
        onImport={() => setImporting(true)}
        onSignOut={signOut}
      />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6">
        {me.needs_reconnect && (
          <a href="/api/auth/login" className="mb-4 flex items-center justify-between rounded-xl border border-maroon-200 bg-maroon-50 p-4 text-sm text-maroon-800">
            <span>Your Gmail connection expired (Google does this every few days for apps in testing).</span>
            <span className="font-semibold">Reconnect Gmail →</span>
          </a>
        )}
        {notice && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="text-amber-700 hover:underline">Dismiss</button>
          </div>
        )}

        {view === "open" && !searching && <Brief name={me.demo ? "" : me.name} brief={brief} onJump={jumpTo} />}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div className="mr-2 inline-flex rounded-xl border border-stone-200 bg-white p-0.5 text-sm">
            {(["open", "done", "dismissed"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => switchView(v)}
                className={`rounded-lg px-3 py-1.5 capitalize ${view === v ? "bg-stone-900 text-white" : "text-stone-600 hover:text-stone-900"}`}
              >
                {v}
              </button>
            ))}
          </div>
          {FILTER_CATEGORIES.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? null : c)}>
              {CATEGORY_LABEL[c]}
            </Chip>
          ))}
          {courses.length > 0 && <span className="mx-1 h-5 w-px bg-stone-200" />}
          {courses.map((c) => (
            <Chip key={c} active={course === c} onClick={() => setCourse(course === c ? null : c)}>
              {c}
            </Chip>
          ))}
        </div>

        {items === null ? (
          <Skeleton />
        ) : view !== "open" || searching ? (
          <FlatList
            title={searching ? `${filtered.length} result${filtered.length === 1 ? "" : "s"}` : view === "done" ? "Done" : "Dismissed"}
            items={filtered}
            highlight={highlight}
            onStatus={setStatus}
          />
        ) : (
          <div className="mt-6 grid gap-x-8 gap-y-10 lg:grid-cols-2">
            <OfficeHours slots={officeHours} calendarConnected={!!me.calendar_connected} />
            {SECTIONS.map((s) =>
              groups[s.id].length === 0 && s.id !== "today" && s.id !== "week" ? null : (
                <section key={s.id} className={s.id === "next" ? "lg:col-span-2" : ""}>
                  <div className="mb-3 flex items-baseline justify-between">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
                      {s.title} <span className="ml-1 text-stone-400">{groups[s.id].length}</span>
                    </h2>
                    <span className="text-xs text-stone-400">{s.hint}</span>
                  </div>
                  {groups[s.id].length === 0 ? (
                    <p className="rounded-xl border border-dashed border-stone-200 p-5 text-sm text-stone-400">Nothing here.</p>
                  ) : (
                    <div className={`grid gap-3 ${s.id === "next" ? "md:grid-cols-2 lg:grid-cols-3" : ""}`}>
                      {groups[s.id].map((item) => (
                        <ItemCard key={item.id} item={item} highlighted={highlight === item.id} onStatus={setStatus} />
                      ))}
                    </div>
                  )}
                </section>
              ),
            )}
          </div>
        )}

        {view === "open" && !searching && items !== null && (
          <section className="mt-10 rounded-xl border border-stone-200 bg-white">
            <button onClick={() => setShowNoise((s) => !s)} className="flex w-full items-center justify-between px-4 py-3 text-sm text-stone-600">
              <span className="inline-flex items-center gap-2">
                <VolumeX className="h-4 w-4 text-stone-400" />
                Noise filtered: <strong className="text-stone-900">{noise.length}</strong> promotions and newsletters hidden
              </span>
              <ChevronDown className={`h-4 w-4 transition ${showNoise ? "rotate-180" : ""}`} />
            </button>
            {showNoise && (
              <ul className="divide-y divide-stone-100 border-t border-stone-100 text-sm">
                {noise.map((n) => (
                  <li key={n.id} className="flex justify-between gap-4 px-4 py-2 text-stone-500">
                    <span className="truncate">{n.title}</span>
                    <span className="shrink-0 text-stone-400">{n.sender}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>

      {importing && (
        <ImportDialog onClose={() => setImporting(false)} onImported={(m) => { setNotice(m); load(); }} />
      )}
      {settings && (
        <SettingsDialog
          me={me}
          onClose={() => setSettings(false)}
          onChanged={(m) => { if (m) setNotice(m); onMeChanged(); load(); }}
          onDeleted={onSignedOut}
        />
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active ? "border-maroon-600 bg-maroon-600 text-white" : "border-stone-200 bg-white text-stone-600 hover:border-stone-300"
      }`}
    >
      {children}
    </button>
  );
}

function FlatList({ title, items, highlight, onStatus }: { title: string; items: Item[]; highlight: string | null; onStatus: (id: string, s: Item["status"]) => void }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-stone-500">{title}</h2>
      {items.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-stone-200 p-10 text-sm text-stone-400">
          <Inbox className="mb-2 h-6 w-6" /> Nothing matches.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((i) => <ItemCard key={i.id} item={i} highlighted={highlight === i.id} onStatus={onStatus} />)}
        </div>
      )}
    </section>
  );
}

function Skeleton() {
  return (
    <div className="mt-6 grid gap-3 md:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-xl bg-stone-200/60" />
      ))}
    </div>
  );
}
