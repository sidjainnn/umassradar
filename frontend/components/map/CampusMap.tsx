"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Dices, DoorOpen, LocateFixed, Navigation, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Minuteman } from "@/components/mascot/Minuteman";
import { KINDS, PLACES, type Place, type PlaceKind, placeForRoom } from "@/lib/places";
import type { ScheduleClass } from "@/lib/store";
import { RoomPanel } from "./RoomPanel";

const CENTER: [number, number] = [42.3895, -72.5265];

function pinHtml(p: Place, n?: number, selected = false) {
  return `<div class="map-pin${selected ? " is-on" : ""}"><span>${p.emoji}</span>${n ? `<b>${n}</b>` : ""}</div>`;
}

type Props = { classesToday: ScheduleClass[] };

export default function CampusMap({ classesToday }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const you = useRef<{ marker: L.Marker; root: Root } | null>(null);
  const [kinds, setKinds] = useState<Set<PlaceKind | "today">>(new Set(["class", "study", "food", "fun", "outdoors"]));
  const [picked, setPicked] = useState<Place | null>(null);
  const [locating, setLocating] = useState(false);
  const [room, setRoom] = useState<string | null>(null);
  const [roomQuery, setRoomQuery] = useState("");
  const [roomMiss, setRoomMiss] = useState(false);

  // "HAS 134", "ILC S240", "Hasbrouck 20": find the building, keep the room number
  function findRoom(text: string) {
    const q = text.trim();
    if (!q) return;
    const m = q.match(/^(.*?)[\s-]*([A-Za-z]?-?\d{1,4}[A-Za-z]?)$/);
    const place = placeForRoom(q) ?? PLACES.find((p) => p.name.toLowerCase().includes((m?.[1] || q).toLowerCase().trim()) && (m?.[1] || q).trim().length > 2);
    if (!place) { setRoomMiss(true); return; }
    setRoomMiss(false);
    setKinds((prev) => new Set([...prev, place.kind]));
    setPicked(place);
    setRoom(m && m[2] && /\d/.test(m[2]) ? m[2].toUpperCase() : null);
  }

  // /map?room=HAS%20134 (from the Schedule)
  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get("room");
    if (r) { setRoomQuery(r); findRoom(r); }
     
  }, []);

  // today's classes, in order, with the building each one is in
  const route = useMemo(
    () => [...classesToday].sort((a, b) => a.start.localeCompare(b.start))
      .map((c) => ({ c, place: placeForRoom(c.location) }))
      .filter((x): x is { c: ScheduleClass; place: Place } => !!x.place),
    [classesToday],
  );

  useEffect(() => {
    if (!box.current || map.current) return;
    const m = L.map(box.current, { center: CENTER, zoom: 16, zoomControl: false, scrollWheelZoom: true });
    L.control.zoom({ position: "topright" }).addTo(m);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  // redraw pins when filters or the selection change
  useEffect(() => {
    const m = map.current, g = layer.current;
    if (!m || !g) return;
    g.clearLayers();
    const showToday = kinds.has("today");
    const todayIds = new Map(route.map((r, i) => [r.place.id, i + 1]));
    for (const p of PLACES) {
      const n = showToday ? todayIds.get(p.id) : undefined;
      if (!kinds.has(p.kind) && !n) continue;
      const icon = L.divIcon({ html: pinHtml(p, n, picked?.id === p.id), className: "", iconSize: [44, 44], iconAnchor: [22, 40] });
      L.marker(p.at, { icon, title: p.name, riseOnHover: true }).on("click", () => setPicked(p)).addTo(g);
    }
    if (showToday && route.length > 1) {
      L.polyline(route.map((r) => r.place.at), { color: "#840028", weight: 4, dashArray: "2 10", lineCap: "round", opacity: 0.8 }).addTo(g);
    }
  }, [kinds, picked, route]);

  useEffect(() => {
    if (picked) map.current?.flyTo(picked.at, Math.max(map.current.getZoom(), 16), { duration: 0.8 });
  }, [picked]);

  function toggle(k: PlaceKind | "today") {
    setKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
    if (k === "today" && route.length && map.current) {
      map.current.flyToBounds(L.latLngBounds(route.map((r) => r.place.at)).pad(0.4), { duration: 0.8 });
    }
  }

  function surprise() {
    const pool = PLACES.filter((p) => p.kind !== "class" && p.id !== picked?.id);
    const p = pool[Math.floor(Math.random() * pool.length)];
    setKinds((prev) => new Set([...prev, p.kind]));
    setPicked(p);
  }

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition((pos) => {
      setLocating(false);
      const at: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      const m = map.current;
      if (!m) return;
      if (!you.current) {
        const el = document.createElement("div");
        const root = createRoot(el);
        root.render(<Minuteman size={44} watch={false} label="You are here" />);
        const marker = L.marker(at, { icon: L.divIcon({ html: el, className: "", iconSize: [44, 53], iconAnchor: [22, 50] }) }).addTo(m);
        you.current = { marker, root };
      } else {
        you.current.marker.setLatLng(at);
      }
      m.flyTo(at, 17, { duration: 0.8 });
    }, () => setLocating(false), { enableHighAccuracy: true, timeout: 10_000 });
  }

  const chip = (on: boolean) => `inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold shadow-sm transition ${on ? "bg-ink text-white" : "bg-white text-ink-soft ring-1 ring-line hover:text-ink"}`;

  return (
    <div className="relative overflow-hidden rounded-[28px] ring-1 ring-line-soft shadow-[0_30px_60px_-40px_rgba(60,0,20,0.6)]">
      <div ref={box} className="campus-map h-[calc(100vh-260px)] min-h-[440px] w-full" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] space-y-2 p-3">
        <form onSubmit={(e) => { e.preventDefault(); findRoom(roomQuery); }}
          className="pointer-events-auto flex max-w-md items-center gap-2 rounded-full bg-white py-1.5 pl-4 pr-1.5 shadow-[0_14px_30px_-16px_rgba(60,0,20,0.5)] ring-1 ring-line-soft">
          <DoorOpen className="h-4 w-4 shrink-0 text-maroon-600" />
          <input value={roomQuery} onChange={(e) => { setRoomQuery(e.target.value); setRoomMiss(false); }} aria-label="Find a room"
            placeholder="Find a room, like HAS 134 or ILC S240" className="min-w-0 flex-1 bg-transparent text-[15px] outline-none focus-visible:outline-none" />
          <button type="submit" className="rounded-full bg-maroon-600 px-3.5 py-1.5 text-sm font-semibold text-white">Find</button>
        </form>
        {roomMiss && <p className="pointer-events-auto w-fit rounded-full bg-white px-3 py-1 text-sm text-ink-muted shadow">That building isn&apos;t on the map yet. Try its name, like “Hasbrouck 134”.</p>}
        <div className="pointer-events-auto flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {route.length > 0 && (
            <button onClick={() => toggle("today")} className={chip(kinds.has("today"))}>🎒 My classes today</button>
          )}
          {KINDS.map((k) => (
            <button key={k.id} onClick={() => toggle(k.id)} className={chip(kinds.has(k.id))}>{k.emoji} {k.label}</button>
          ))}
        </div>
      </div>

      <div className="absolute bottom-24 right-3 z-[500] flex flex-col gap-2">
        <button onClick={surprise} className="inline-flex items-center gap-2 rounded-full bg-maroon-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_rgba(132,0,40,0.8)] hover:bg-maroon-700">
          <Dices className="h-4 w-4" /> Surprise me
        </button>
        <button onClick={locate} aria-label="Show where I am" className="ml-auto grid h-10 w-10 place-items-center rounded-full bg-white shadow ring-1 ring-line hover:bg-paper">
          <LocateFixed className={`h-4 w-4 ${locating ? "animate-pulse text-maroon-600" : ""}`} />
        </button>
      </div>

      {picked && (
        <div className="rise absolute inset-x-3 bottom-3 z-[600] max-h-[70%] overflow-y-auto rounded-[24px] bg-white p-4 shadow-2xl ring-1 ring-line-soft sm:left-3 sm:right-auto sm:w-[360px]">
          <div className="flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-maroon-50 text-2xl">{picked.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[18px] font-extrabold leading-tight tracking-[-0.02em]">{picked.name}</p>
              <p className="text-[13px] text-ink-muted">{KINDS.find((k) => k.id === picked.kind)?.label}</p>
            </div>
            <button onClick={() => { setPicked(null); setRoom(null); }} aria-label="Close" className="rounded-full p-1 text-ink-muted hover:bg-paper"><X className="h-4 w-4" /></button>
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{picked.blurb}</p>
          {kinds.has("today") && route.some((r) => r.place.id === picked.id) && (
            <p className="mt-2 text-sm font-semibold text-maroon-700">
              Today: {route.filter((r) => r.place.id === picked.id).map((r) => `${r.c.course} at ${r.c.start}`).join(", ")}
            </p>
          )}
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${picked.at[0]},${picked.at[1]}&travelmode=walking`} target="_blank" rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-sm font-semibold text-ink hover:bg-line-soft">
            <Navigation className="h-4 w-4" /> Walking directions
          </a>
          {(picked.kind === "class" || picked.kind === "study" || room) && (
            <RoomPanel building={picked.id} buildingName={picked.name} room={room} onRoom={setRoom} />
          )}
        </div>
      )}
    </div>
  );
}
