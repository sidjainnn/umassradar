"use client";

import { Flag, ThumbsUp, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";

type Tip = { id: string; room: string | null; text: string; helpful: number; marked_helpful: boolean; mine: boolean };
type Info = { guess: { room: string; floor: number | null; wing: string | null; label: string | null } | null; room_tips: Tip[]; building_tips: Tip[]; other_rooms: string[] };

/** Floor guess and student tips for one building (and optionally one room in it). */
export function RoomPanel({ building, buildingName, room, onRoom }: { building: string; buildingName: string; room: string | null; onRoom: (r: string) => void }) {
  const { me } = useStore();
  const [info, setInfo] = useState<Info | null>(null);
  const [text, setText] = useState("");
  const [aboutRoom, setAboutRoom] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<Info>(`/rooms/${building}${room ? `?room=${encodeURIComponent(room)}` : ""}`).then(setInfo).catch(() => setInfo(null));
  }, [building, room]);
  useEffect(() => { load(); }, [load]);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      await api("/rooms/tips", { method: "POST", body: JSON.stringify({ building, room: room && aboutRoom ? room : null, text }) });
      setText("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add that tip.");
    } finally {
      setBusy(false);
    }
  }

  const TipRow = ({ t }: { t: Tip }) => (
    <li className="rounded-2xl bg-paper px-3 py-2.5 text-[14px] leading-relaxed text-ink">
      {t.text}
      <span className="mt-1 flex items-center gap-3 text-[12px] text-ink-muted">
        <button onClick={() => api(`/rooms/tips/${t.id}/helpful`, { method: "POST" }).then(load)} disabled={me.demo}
          className={`inline-flex items-center gap-1 ${t.marked_helpful ? "font-semibold text-maroon-700" : "hover:text-ink"}`}>
          <ThumbsUp className="h-3.5 w-3.5" /> Helpful{t.helpful ? ` · ${t.helpful}` : ""}
        </button>
        {t.mine ? (
          <button onClick={() => api(`/rooms/tips/${t.id}`, { method: "DELETE" }).then(load)} className="inline-flex items-center gap-1 hover:text-ink"><Trash2 className="h-3.5 w-3.5" />Delete</button>
        ) : !me.demo && (
          <button onClick={() => { const reason = prompt("What's wrong with this tip?"); if (reason) api(`/rooms/tips/${t.id}/report`, { method: "POST", body: JSON.stringify({ reason }) }).then(load); }}
            className="inline-flex items-center gap-1 hover:text-ink"><Flag className="h-3.5 w-3.5" />Report</button>
        )}
      </span>
    </li>
  );

  return (
    <div className="mt-3 space-y-3">
      {room && (
        <div className="rounded-2xl bg-maroon-50 px-3 py-2.5">
          <p className="font-display text-[16px] font-extrabold tracking-[-0.02em] text-maroon-700">Room {info?.guess?.room ?? room}</p>

        </div>
      )}
      {!!info?.room_tips.length && (
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink-muted">How to find {room}</p>
          <ul className="space-y-1.5">{info.room_tips.map((t) => <TipRow key={t.id} t={t} />)}</ul>
        </div>
      )}
      {!!info?.building_tips.length && (
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink-muted">Getting around {buildingName}</p>
          <ul className="space-y-1.5">{info.building_tips.map((t) => <TipRow key={t.id} t={t} />)}</ul>
        </div>
      )}
      {info && !info.room_tips.length && !info.building_tips.length && (
        <p className="text-sm text-ink-muted">No tips yet. Been here? Help the next freshman find it.</p>
      )}
      {!!info?.other_rooms.length && (
        <p className="flex flex-wrap gap-1.5 text-[12px]">
          {info.other_rooms.slice(0, 10).map((r) => (
            <button key={r} onClick={() => onRoom(r)} className="rounded-full bg-white px-2 py-0.5 font-semibold text-ink-soft ring-1 ring-line hover:text-ink">{r}</button>
          ))}
        </p>
      )}
      {me.demo ? (
        <p className="text-[12px] text-ink-faint">Sign in with your UMass account to add tips.</p>
      ) : (
        <div className="space-y-1.5">
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={280} rows={2}
            placeholder={room ? `e.g. “${room} is past the elevators, second door on the left”` : "e.g. “Use the side door by the bike racks, it's closer to the stairs”"}
            className="w-full resize-none rounded-2xl bg-paper px-3 py-2 text-[14px] outline-none focus-visible:outline-none focus:ring-2 focus:ring-maroon-200" />
          <div className="flex items-center gap-3">
            {room && (
              <label className="flex items-center gap-1.5 text-[12px] text-ink-muted">
                <input type="checkbox" checked={aboutRoom} onChange={(e) => setAboutRoom(e.target.checked)} /> About {room}
              </label>
            )}
            <button onClick={add} disabled={busy || text.trim().length < 8}
              className="ml-auto rounded-full bg-maroon-600 px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-40">Add tip</button>
          </div>
          {error && <p className="text-[12px] text-maroon-700">{error}</p>}
        </div>
      )}
    </div>
  );
}
