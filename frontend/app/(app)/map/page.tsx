"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/Page";
import { useStore } from "@/lib/store";
import { easternWeekday } from "@/lib/time";
import { RoomFinder } from "@/components/map/RoomFinder";
import type { LocatedRoom } from "@/lib/features";

// Leaflet needs the browser
const CampusMap = dynamic(() => import("@/components/map/CampusMap"), {
  ssr: false,
  loading: () => <div className="h-[calc(100vh-260px)] min-h-[440px] animate-pulse rounded-[28px] bg-line-soft" />,
});

export default function MapPage() {
  const { schedule } = useStore();
  const [requestedRoom, setRequestedRoom] = useState("");
  const [locatedRoom, setLocatedRoom] = useState<LocatedRoom | null>(null);
  useEffect(() => { setRequestedRoom(new URLSearchParams(window.location.search).get("room") ?? ""); }, []);
  const today = easternWeekday();
  const classesToday = useMemo(() => (schedule?.classes ?? []).filter((c) => c.days.includes(today)), [schedule, today]);
  return (
    <div className="pb-10">
      <PageHeader title="Explore Amherst" subtitle="Classes, food, study spots and the best places to get outside. Tap a pin, or let Sam surprise you." />
      <RoomFinder requestedRoom={requestedRoom} onLocated={setLocatedRoom} />
      <CampusMap classesToday={classesToday} locatedRoom={locatedRoom} onRoomQuery={setRequestedRoom} />
    </div>
  );
}
