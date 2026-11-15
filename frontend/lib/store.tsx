"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, ApiError, type Item, type Me, type OfficeHourSlot } from "./api";
import { type Mode, ModeContext } from "./mode";

export type BriefData = {
  sentences: { text: string; item_ids: string[] }[];
  generated_by: "llm" | "template";
  generated_at: string;
  fresh: boolean;
};

export type ScheduleClass = {
  course: string;
  title: string | null;
  section: string | null;
  component: string | null;
  days: number[];
  start: string;
  end: string;
  location: string | null;
  instructor: string | null;
};

export type Schedule = { term: string | null; classes: ScheduleClass[]; uploaded_at: string } | null;

type Store = {
  me: Me;
  items: Item[] | null;
  noise: Item[];
  officeHours: OfficeHourSlot[];
  schedule: Schedule;
  brief: BriefData | null;
  syncing: boolean;
  notice: string | null;
  setNotice: (n: string | null) => void;
  refresh: () => Promise<void>;
  reload: () => Promise<void>;
  reloadMe: () => Promise<void>;
  mode: Mode;
  setMode: (m: Mode) => void;
  setStatus: (id: string, status: Item["status"]) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Store | null>(null);
const STALE_MS = 15 * 60 * 1000;

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

/** Loads everything once, keeps it fresh, and shares it between pages so switching tabs is instant. */
export function StoreProvider({
  me: initialMe,
  onSignedOut,
  children,
}: {
  me: Me;
  onSignedOut: () => void;
  children: React.ReactNode;
}) {
  const [me, setMe] = useState(initialMe);
  const [items, setItems] = useState<Item[] | null>(null);
  const [noise, setNoise] = useState<Item[]>([]);
  const [officeHours, setOfficeHours] = useState<OfficeHourSlot[]>([]);
  const [schedule, setSchedule] = useState<Schedule>(null);
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const briefTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadBrief = useCallback(() => {
    if (briefTimer.current) clearTimeout(briefTimer.current);
    const started = Date.now();
    const poll = async () => {
      try {
        const b = await api<BriefData>("/brief");
        setBrief(b);
        // the Gemini version is built in the background; check back until it's ready (max ~20 s)
        if (!b.fresh && Date.now() - started < 20_000) briefTimer.current = setTimeout(poll, 2000);
      } catch {
        /* keep whatever we had */
      }
    };
    poll();
  }, []);

  const reload = useCallback(async () => {
    const [open, noiseList] = await Promise.all([
      api<Item[]>("/items?status=open"),
      api<Item[]>("/items?status=open&category=noise"),
    ]);
    setItems(open);
    setNoise(noiseList);
    api<OfficeHourSlot[]>("/office-hours").then(setOfficeHours).catch(() => setOfficeHours([]));
    api<Schedule>("/schedule").then(setSchedule).catch(() => setSchedule(null));
    loadBrief();
  }, [loadBrief]);

  const reloadMe = useCallback(async () => {
    try {
      setMe(await api<Me>("/me"));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) onSignedOut();
    }
  }, [onSignedOut]);

  const refresh = useCallback(async () => {
    setSyncing(true);
    try {
      const r = await api<{ status: string; message?: string }>("/sync", { method: "POST" });
      if (r.status !== "ok" && r.message) setNotice(r.message);
      await Promise.all([reloadMe(), reload()]);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  }, [reload, reloadMe]);

  const setStatus = useCallback(
    async (id: string, status: Item["status"]) => {
      setItems((prev) => prev?.filter((i) => i.id !== id) ?? null);
      await api(`/items/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      loadBrief();
    },
    [loadBrief],
  );

  const mode: Mode = me.mode ?? "study";
  const setMode = useCallback((m: Mode) => {
    setMe((prev) => ({ ...prev, mode: m }));
    api("/settings/mode", { method: "PUT", body: JSON.stringify({ mode: m }) }).catch(() => {});
  }, []);
  useEffect(() => {
    document.documentElement.dataset.mode = mode;
    return () => { delete document.documentElement.dataset.mode; };
  }, [mode]);

  const signOut = useCallback(async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    onSignedOut();
  }, [onSignedOut]);

  useEffect(() => {
    reload().catch((e) => setNotice(String(e)));
    const stale = !me.last_sync_at || Date.now() - new Date(me.last_sync_at).getTime() > STALE_MS;
    if (stale && !me.demo && !me.needs_reconnect) refresh();
    return () => {
      if (briefTimer.current) clearTimeout(briefTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Ctx.Provider
      value={{ me, items, noise, officeHours, schedule, brief, syncing, notice, setNotice, refresh, reload, reloadMe, setStatus, signOut, mode, setMode }}
    >
      <ModeContext.Provider value={mode}>{children}</ModeContext.Provider>
    </Ctx.Provider>
  );
}
