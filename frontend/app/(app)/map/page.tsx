"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
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

function MapContent() {
  const { schedule } = useStore();
  const [locatedRoom, setLocatedRoom] = useState<LocatedRoom | null>(null);
  const params = useSearchParams();
  const router = useRouter();
  const requestedRoom = params.get("room") ?? "";
  useEffect(() => { setLocatedRoom(null); }, [requestedRoom]);
  const openRoom = useCallback((query: string) => {
    router.push(`/map?room=${encodeURIComponent(query)}`, { scroll: false });
  }, [router]);
  const today = easternWeekday();
  const classesToday = useMemo(() => (schedule?.classes ?? []).filter((c) => c.days.includes(today)), [schedule, today]);
  return (
    <div className="pb-10">
      <PageHeader title="Explore Amherst" subtitle="Classes, food, study spots and the best places to get outside. Tap a pin, or let Sam surprise you." />
      <RoomFinder requestedRoom={requestedRoom} onLocated={setLocatedRoom} />
      <CampusMap classesToday={classesToday} locatedRoom={locatedRoom} onRoomQuery={openRoom} />
    </div>
  );
}

export default function MapPage() {
  return <Suspense fallback={<div role="status" className="p-6 text-sm text-ink-muted">Loading map…</div>}><MapContent /></Suspense>;
}
