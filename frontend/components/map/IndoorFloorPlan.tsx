"use client";

import { useEffect, useId, useState } from "react";
import type { IndoorBuilding, IndoorRoute, Point } from "@/lib/features";

export function IndoorFloorPlan({ building, route, onRoom }: { building: IndoorBuilding; route: IndoorRoute | null; onRoom: (code: string) => void }) {
  const [floor, setFloor] = useState(route?.floor ?? building.ground_floor);
  const titleId = useId();
  useEffect(() => { setFloor(route?.floor ?? building.ground_floor); }, [route, building]);
  const shown = building.floors.find((f) => f.level === floor) ?? building.floors[0];
  if (!shown) return <p className="text-sm text-ink-muted">No floor geometry is available.</p>;
  const points = shown.rooms.flatMap((r) => r.polygon).concat(shown.corridors.flat(), shown.stairs, shown.elevators);
  if (!points.length) return <p className="text-sm text-ink-muted">This floor has no mapped rooms.</p>;
  const cos = Math.cos(building.center[0] * Math.PI / 180);
  const minX = Math.min(...points.map((p) => p[1] * cos)), maxX = Math.max(...points.map((p) => p[1] * cos));
  const minY = Math.min(...points.map((p) => p[0])), maxY = Math.max(...points.map((p) => p[0]));
  const scale = 920 / Math.max(maxX - minX, maxY - minY, 0.00001);
  const width = Math.max(280, (maxX - minX) * scale + 80), height = Math.max(200, (maxY - minY) * scale + 80);
  const xy = (p: Point): Point => [40 + (p[1] * cos - minX) * scale, 40 + (maxY - p[0]) * scale];
  const coords = (ps: Point[]) => ps.map((p) => xy(p).join(",")).join(" ");
  const center = (ps: Point[]): Point => xy([ps.reduce((s, p) => s + p[0], 0) / ps.length, ps.reduce((s, p) => s + p[1], 0) / ps.length]);
  const legs = route?.legs.filter((l) => l.level === shown.level) ?? [];
  return <section className="space-y-3" aria-label="Indoor floor map">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{building.building} · Floor {shown.level}</h3>
      <div className="flex flex-wrap gap-1" aria-label="Choose floor">{building.floors.map((f) => <button key={f.level} aria-pressed={f.level === shown.level} onClick={() => setFloor(f.level)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${f.level === shown.level ? "bg-maroon-600 text-white" : "bg-paper text-ink"}`}>Floor {f.level}</button>)}</div></div>
    <p className="text-xs text-ink-muted">{shown.source === "generated" ? "Approximate layout from the registrar room list. Exact room positions are not verified." : "Traced from the floor plan posted in the building."}</p>
    <div className="overflow-x-auto rounded-2xl border border-line-soft bg-paper p-2">
      <svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: 500, maxHeight: 520 }} className="w-full" role="img" aria-labelledby={titleId}>
        <title id={titleId}>{building.building}, floor {shown.level}, classroom shapes and route</title>
        {shown.other?.map((r, i) => <polygon key={i} points={coords(r.polygon)} fill="white" stroke="var(--color-line)" strokeWidth="1" />)}
        {shown.corridors.map((line, i) => <polyline key={i} points={coords(line)} fill="none" stroke="var(--color-line)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />)}
        {shown.rooms.map((r) => {
          const selected = r.code === route?.code;
          const c = center(r.polygon);
          return <g key={r.code} role="button" tabIndex={0} aria-label={`Directions to ${r.code}`} onClick={() => onRoom(r.code)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onRoom(r.code); } }} className="cursor-pointer">
            <polygon points={coords(r.polygon)} fill={selected ? "var(--color-maroon-600)" : "white"} stroke={selected ? "var(--color-maroon-800)" : "var(--color-line)"} strokeWidth={selected ? 3 : 1.5} />
            <text x={c[0]} y={c[1]} textAnchor="middle" dominantBaseline="middle" fontSize="22" fontWeight={selected ? 800 : 500} fill={selected ? "white" : "var(--color-ink)"}>{r.room}</text>
          </g>;
        })}
        {legs.map((leg, i) => <polyline key={i} points={coords(leg.line)} fill="none" stroke="var(--color-maroon-600)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="9 5" />)}
        {route && route.floor === shown.level && <polygon points={coords(route.room_polygon)} fill="none" stroke="var(--color-maroon-600)" strokeWidth="4" />}
        {shown.stairs.map((p, i) => { const [x, y] = xy(p); return <g key={`s${i}`}><circle cx={x} cy={y} r="12" fill="white" stroke="var(--color-ink-muted)" /><text x={x} y={y + 4} textAnchor="middle" fontSize="12">S</text></g>; })}
        {shown.elevators.map((p, i) => { const [x, y] = xy(p); return <g key={`e${i}`}><circle cx={x} cy={y} r="12" fill="var(--color-maroon-100)" stroke="var(--color-maroon-600)" /><text x={x} y={y + 4} textAnchor="middle" fontSize="12">E</text></g>; })}
      </svg>
    </div>
    <p className="text-xs text-ink-muted">S = stairs · E = elevator · Dashed line = route on this floor. Tap a room for directions.</p>
    {route && <div className="rounded-2xl bg-maroon-50 p-4"><p className="text-sm font-semibold text-maroon-800">To {route.room} · About {route.minutes} min indoors</p>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-ink-soft">{route.steps.map((s, i) => <li key={i}>{s}</li>)}</ol></div>}
  </section>;
}
