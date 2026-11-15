"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { PageHeader } from "@/components/Page";
import { useStore } from "@/lib/store";
import { easternWeekday } from "@/lib/time";

// Leaflet needs the browser
const CampusMap = dynamic(() => import("@/components/map/CampusMap"), {
  ssr: false,
  loading: () => <div className="h-[calc(100vh-260px)] min-h-[440px] animate-pulse rounded-[28px] bg-line-soft" />,
});

export default function MapPage() {
  const { schedule } = useStore();
  const today = easternWeekday();
  const classesToday = useMemo(() => (schedule?.classes ?? []).filter((c) => c.days.includes(today)), [schedule, today]);
  return (
    <div className="pb-10">
      <PageHeader title="Explore Amherst" subtitle="Classes, food, study spots and the best places to get outside. Tap a pin, or let Sam surprise you." />
      <CampusMap classesToday={classesToday} />
    </div>
  );
}
