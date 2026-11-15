"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { checkedApi, indoorBuildingData, indoorRouteData, listData, locatedRoomData, walkingRouteData, type IndoorBuilding, type IndoorRoute, type IndoorSummary, type LocatedRoom, type WalkingRoute } from "@/lib/features";
import { useStore } from "@/lib/store";
import { ResourceError } from "../ResourceError";
import { RoomPanel } from "./RoomPanel";
import { IndoorFloorPlan } from "./IndoorFloorPlan";
import { ClassLocations } from "../ClassLocations";
import { useResource } from "@/lib/useResource";

export function RoomFinder({ requestedRoom, onLocated }: { requestedRoom: string; onLocated: (r: LocatedRoom) => void }) {
  const { me } = useStore();
  const [q, setQ] = useState("");
  const [accessible, setAccessible] = useState(false);
  const [result, setResult] = useState<LocatedRoom | null>(null);
  const [indoor, setIndoor] = useState<IndoorBuilding | null>(null);
  const [indoorRoute, setIndoorRoute] = useState<IndoorRoute | null>(null);
  const indoorList = useResource<IndoorSummary[]>("/indoor/buildings", listData<IndoorSummary>);
  const [from, setFrom] = useState("");
  const [route, setRoute] = useState<WalkingRoute | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [floor, setFloor] = useState("");
  const [entrance, setEntrance] = useState("");
  const [landmark, setLandmark] = useState("");
  const request = useRef<AbortController | null>(null);
  const input = "min-w-0 rounded-xl border border-line bg-white px-3 py-2 text-sm";
  const button = "rounded-full bg-maroon-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40";
  const lookup = useCallback(async (query: string, access: boolean) => {
    if (!query.trim()) return;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setBusy("find"); setError(null); setNotice(null); setRoute(null); setResult(null); setIndoor(null); setIndoorRoute(null);
    try {
      const [directions, location] = await Promise.allSettled([
        checkedApi(`/indoor/route?${new URLSearchParams({ to: query, accessible: String(access) })}`, indoorRouteData, controller.signal),
        checkedApi(`/rooms/locate?${new URLSearchParams({ q: query, accessible: String(access) })}`, locatedRoomData, controller.signal),
      ]);
      const floors = await checkedApi(`/indoor/${encodeURIComponent(query)}`, indoorBuildingData, controller.signal).catch(() => null);
      if (controller.signal.aborted) return;
      if (location.status === "rejected" && !floors) throw location.reason;
      setIndoor(floors);
      if (directions.status === "fulfilled") setIndoorRoute(directions.value);
      else if (floors && /\d/.test(query)) setNotice("No verified route to this room is available. You can browse the building's floors below.");
      if (location.status === "fulfilled") {
        const data = location.value;
        setResult(data); setFloor(data.floor?.floor == null ? "" : String(data.floor.floor)); setEntrance(data.entrances[0]?.id ?? ""); setLandmark(""); onLocated(data);
      }
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Couldn't find that room."); }
    finally { if (!controller.signal.aborted) setBusy(null); }
  }, [onLocated]);
  useEffect(() => {
    if (requestedRoom) { setQ(requestedRoom); setAccessible(false); void lookup(requestedRoom, false); }
    return () => request.current?.abort();
  }, [requestedRoom, lookup]);
  async function walk(e: React.FormEvent) {
    e.preventDefault(); if (!result) return;
    setBusy("route"); setError(null); setRoute(null);
    try { setRoute(await checkedApi(`/rooms/route?${new URLSearchParams({ frm: from, to: result.query })}`, walkingRouteData)); }
    catch (e) { setError(e instanceof Error ? e.message : "Couldn't estimate that walk."); } finally { setBusy(null); }
  }
  async function confirmRoom(e: React.FormEvent) {
    e.preventDefault(); if (!result) return;
    setBusy("confirm"); setError(null); setNotice(null);
    try {
      await api(`/rooms/confirm?${new URLSearchParams({ q: result.query })}`, { method: "POST", body: JSON.stringify({ floor: Number(floor), entrance_id: entrance || null, landmark: landmark || null }) });
      await lookup(result.query, accessible); setNotice("Thanks! Your room confirmation was recorded.");
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't confirm that room."); } finally { setBusy(null); }
  }
  return <section className="mb-5 rounded-[24px] border border-line-soft bg-white p-5 sm:p-6" aria-label="Room finder">
    <h2 className="font-display text-xl font-extrabold">Find your room</h2><p className="mt-1 text-sm text-ink-muted">Use a building name or the code on your schedule, like MOR1 N375.</p>
    <form onSubmit={(e) => { e.preventDefault(); void lookup(q, accessible); }} className="mt-4 space-y-3">
      <div className="flex gap-2"><input required aria-label="Building and room" list="indoor-buildings" value={q} onChange={(e) => setQ(e.target.value)} placeholder="MOR1 N375 or ILC S220" className={`flex-1 ${input}`} /><button disabled={busy !== null || !q.trim()} className={button}>{busy === "find" ? "Finding…" : "Find room"}</button></div>
      <datalist id="indoor-buildings">{indoorList.data?.map((b) => <option key={b.id} value={b.building}>{b.classrooms} classrooms</option>)}</datalist>
      <label className="flex items-center gap-2 text-sm text-ink-muted"><input type="checkbox" checked={accessible} onChange={(e) => { setAccessible(e.target.checked); if (q.trim()) void lookup(q, e.target.checked); }} />Step-free route (use elevators)</label>
    </form>
    {error && <div className="mt-3"><ResourceError message={error} /></div>}
    {notice && <p role="status" className="mt-3 text-sm text-forest">{notice}</p>}
    <div className="mt-5"><ClassLocations compact onPick={(to) => { setQ(to); void lookup(to, accessible); }} /></div>
    {indoor && <div className="mt-5"><IndoorFloorPlan building={indoor} route={indoorRoute} onRoom={(code) => { setQ(code); void lookup(code, accessible); }} /></div>}
    {result && <div className="mt-5 space-y-5">
      <div className="rounded-2xl bg-maroon-50 p-4"><h3 className="font-semibold text-maroon-800">{result.building.name}{result.room ? ` · ${result.room}` : ""}</h3>
        <p className="mt-1 text-sm text-ink-soft">{result.floor?.label ?? "No floor estimate available."}</p>
        <p className="mt-1 text-xs text-ink-muted">{result.confirmed ? `Confirmed by ${result.confirmed.count} students.` : "Floor estimate from the room number; not a verified floor plan."}</p></div>
      {!indoorRoute && <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-soft">{result.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>}
      {accessible && <p className="text-xs text-ink-muted">Accessibility details may be incomplete. Check building signage and the mapped door details.</p>}
      {!!result.entrances.length && <p className="text-xs text-ink-muted">Mapped doors: {result.entrances.map((d, i) => `${i + 1}: ${d.side ?? "side unknown"}${d.wheelchair ? ` (wheelchair: ${d.wheelchair})` : ""}`).join(" · ")}</p>}
      <form onSubmit={walk} className="space-y-2"><label className="text-sm font-semibold" htmlFor="walk-from">Walking from another class?</label>
        <div className="flex gap-2"><input id="walk-from" required value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From, e.g. Hasbrck134" className={`flex-1 ${input}`} /><button disabled={busy !== null || !from.trim()} className={button}>Estimate walk</button></div></form>
      {route && <div role="status" className="rounded-2xl bg-paper p-4 text-sm"><p className="font-semibold">{route.same_building ? "Same building" : `About ${route.minutes} min · ${route.meters} m`}</p><p className="mt-1">{route.from} → {route.to}</p>
        {route.exit && <p className="mt-1">Exit via the {route.exit.side ?? "mapped"} door.</p>}{route.enter && <p>Enter via the {route.enter.side ?? "mapped"} door.</p>}<p className="mt-2 text-xs text-ink-muted">Approximate walking estimate between buildings, not indoor navigation.</p></div>}
      {!!result.classes_here.length && <details className="text-sm"><summary className="cursor-pointer font-semibold">Classes in this room ({result.classes_here.length})</summary><ul className="mt-2 space-y-2">{result.classes_here.map((c, i) => <li key={i}><Link href={`/courses/${encodeURIComponent(c.course)}`} className="font-semibold text-maroon-700 underline">{c.course}</Link> · {c.section} · {c.start}–{c.end} · {c.term}</li>)}</ul></details>}
      {result.room && <details className="text-sm"><summary className="cursor-pointer font-semibold">Found it? Confirm the room</summary>
        {me.demo ? <p className="mt-2 text-ink-muted">Sign in with your UMass account to confirm rooms.</p> : <form onSubmit={confirmRoom} className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold">Floor<input required type="number" min={-2} max={25} value={floor} onChange={(e) => setFloor(e.target.value)} className={input} /></label>
          <label className="grid gap-1 text-xs font-semibold">Entrance<select value={entrance} onChange={(e) => setEntrance(e.target.value)} className={input}><option value="">Not sure</option>{result.entrances.map((d, i) => <option key={d.id} value={d.id}>Door {i + 1} · {d.side ?? "side unknown"}</option>)}</select></label>
          <label className="grid gap-1 text-xs font-semibold sm:col-span-2">Landmark (optional)<input maxLength={140} value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Past the elevators on the left" className={input} /></label>
          <button disabled={busy !== null} className={`justify-self-start ${button}`}>Confirm room</button></form>}
      </details>}
      <RoomPanel key={`${result.building.id}:${result.room}`} building={result.building.id} buildingName={result.building.name} room={result.room} onRoom={(r) => { setQ(`${result.building.name} ${r}`); void lookup(`${result.building.name} ${r}`, accessible); }} />
      <p className="text-xs text-ink-muted">{result.source} © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap contributors</a>.</p>
    </div>}
  </section>;
}
