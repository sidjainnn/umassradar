"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { BedDouble, BookOpen, CalendarDays, Dices, GraduationCap, HeartPulse, LocateFixed, MapPin, Navigation, Sparkles, Trees, Utensils, X, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { KINDS, PLACES, type Place, type PlaceKind, placeForRoom } from "@/lib/places";
import type { ScheduleClass } from "@/lib/store";
import { listData, type Building, type LocatedRoom } from "@/lib/features";
import { useResource } from "@/lib/useResource";
import { useMode } from "@/lib/mode";

const CENTER: [number, number] = [42.3895, -72.5265];
const CATEGORY_ICONS: Record<PlaceKind, LucideIcon> = {
  class: GraduationCap, study: BookOpen, food: Utensils, fun: Sparkles,
  outdoors: Trees, living: BedDouble, help: HeartPulse,
};

function pinHtml(n?: number, selected = false) {
  return `<span class="campus-dot${selected ? " campus-dot-selected" : ""}">${n ?? ""}</span>`;
}

type Props = { classesToday: ScheduleClass[]; locatedRoom: LocatedRoom | null; onRoomQuery: (q: string) => void };

export default function CampusMap({ classesToday, locatedRoom, onRoomQuery }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const buildingLayer = useRef<L.LayerGroup | null>(null);
  const roomLayer = useRef<L.LayerGroup | null>(null);
  const buildings = useResource<Building[]>("/rooms/buildings", listData<Building>);
  const mode = useMode();
  const you = useRef<L.Marker | null>(null);
  const [kinds, setKinds] = useState<Set<PlaceKind | "today">>(new Set(["class", "study", "food", "fun", "outdoors"]));
  const [picked, setPicked] = useState<Place | null>(null);
  const [locating, setLocating] = useState(false);

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
    buildingLayer.current = L.layerGroup().addTo(m);
    roomLayer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const g = buildingLayer.current;
    if (!g) return;
    g.clearLayers();
    for (const b of buildings.data ?? []) {
      if (b.outline?.length >= 3) L.polygon(b.outline, { color: mode === "work" ? "#426c49" : "#840028", weight: 1, fillOpacity: 0.08 })
        .on("click", () => onRoomQuery(b.name)).addTo(g);
    }
  }, [buildings.data, mode, onRoomQuery]);

  useEffect(() => {
    const g = roomLayer.current, m = map.current;
    if (!g || !m) return;
    g.clearLayers();
    setPicked(null);
    if (!locatedRoom) return;
    const color = mode === "work" ? "#254e3b" : "#840028";
    if (locatedRoom.building.outline.length >= 3) L.polygon(locatedRoom.building.outline, { color, weight: 3, fillOpacity: 0.18 }).addTo(g);
    for (const [i, door] of locatedRoom.entrances.entries()) {
      const label = document.createElement("span"); label.textContent = `Door ${i + 1}: ${door.side ?? "side unknown"}${i === 0 ? " · suggested entrance" : ""}`;
      L.circleMarker(door.at, { radius: i === 0 ? 9 : 6, color: "#fff", weight: 2, fillColor: color, fillOpacity: 1 }).bindTooltip(label).addTo(g);
    }
    m.flyTo(locatedRoom.building.center, 18, { duration: 0.6 });
  }, [locatedRoom, mode]);

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
      const icon = L.divIcon({ html: pinHtml(n, picked?.id === p.id), className: "", iconSize: [18, 18], iconAnchor: [9, 9] });
      L.marker(p.at, { icon, title: p.name, riseOnHover: true }).on("click", () => setPicked(p)).addTo(g);
    }
    if (showToday && route.length > 1) {
      L.polyline(route.map((r) => r.place.at), { color: mode === "work" ? "#254e3b" : "#840028", weight: 3, dashArray: "2 10", lineCap: "round", opacity: 0.8 }).addTo(g);
    }
  }, [kinds, picked, route, mode]);

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
        you.current = L.marker(at, { title: "You are here", icon: L.divIcon({ html: '<span class="campus-dot campus-dot-selected"></span>', className: "", iconSize: [18, 18], iconAnchor: [9, 9] }) }).addTo(m);
      } else {
        you.current.setLatLng(at);
      }
      m.flyTo(at, 17, { duration: 0.8 });
    }, () => setLocating(false), { enableHighAccuracy: true, timeout: 10_000 });
  }

  const chip = (on: boolean) => `inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold shadow-sm transition ${on ? "bg-maroon-600 text-white" : "bg-white text-ink-soft ring-1 ring-line hover:text-ink"}`;
  const PlaceIcon = picked ? CATEGORY_ICONS[picked.kind] : MapPin;

  return (
    <div className="relative overflow-hidden rounded-[28px] ring-1 ring-line-soft shadow-[0_30px_60px_-40px_rgba(60,0,20,0.6)]">
      <div ref={box} className="campus-map h-[calc(100vh-260px)] min-h-[440px] w-full" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] space-y-2 p-3">
        {buildings.error && <p className="pointer-events-auto w-fit rounded-xl bg-white p-2 text-xs text-ink-muted">Building outlines unavailable. <button onClick={buildings.reload} className="underline">Retry</button></p>}
        <div className="pointer-events-auto flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {route.length > 0 && (
            <button onClick={() => toggle("today")} aria-pressed={kinds.has("today")} className={chip(kinds.has("today"))}><CalendarDays className="h-4 w-4" aria-hidden="true" />My classes today</button>
          )}
          {KINDS.map((k) => {
            const Icon = CATEGORY_ICONS[k.id];
            return <button key={k.id} onClick={() => toggle(k.id)} aria-pressed={kinds.has(k.id)} className={chip(kinds.has(k.id))}><Icon className="h-4 w-4" aria-hidden="true" />{k.label}</button>;
          })}
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
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-maroon-50 text-maroon-700"><PlaceIcon className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-[18px] font-extrabold leading-tight tracking-[-0.02em]">{picked.name}</p>
              <p className="text-[13px] text-ink-muted">{KINDS.find((k) => k.id === picked.kind)?.label}</p>
            </div>
            <button onClick={() => setPicked(null)} aria-label="Close" className="rounded-full p-1 text-ink-muted hover:bg-paper"><X className="h-4 w-4" /></button>
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
          {(picked.kind === "class" || picked.kind === "study") && <button onClick={() => onRoomQuery(picked.name)} className="mt-3 block text-sm font-semibold text-maroon-700 underline">Find rooms and mapped entrances</button>}
        </div>
      )}
    </div>
  );
}
