"use client";

import { ItemList } from "@/components/ItemRow";
import { PageHeader } from "@/components/Page";
import { whenOf } from "@/lib/sections";
import { useStore } from "@/lib/store";
import { useFocusItem } from "@/lib/useFocus";

export default function OpportunitiesPage() {
  const { items, setStatus } = useStore();
  const now = new Date();
  const opps = (items ?? []).filter((i) => i.category === "opportunity");
  const withDeadline = opps.filter((i) => whenOf(i) && whenOf(i)! > now).sort((a, b) => whenOf(a)!.getTime() - whenOf(b)!.getTime());
  const open = opps.filter((i) => !whenOf(i) || whenOf(i)! <= now);
  useFocusItem(items !== null);

  return (
    <div className="max-w-3xl space-y-8 pb-16">
      <PageHeader title="Opportunities" subtitle="Jobs, research, RA and PM positions and clubs from your email and campus pages." />
      {items === null ? (
        <div className="h-40 animate-pulse rounded-xl bg-line-soft" />
      ) : (
        <>
          <ItemList title="Apply soon" items={withDeadline} onStatus={setStatus}
            empty="No application deadlines coming up. New postings show up here as they arrive." />
          {open.length > 0 && <ItemList title="No deadline listed" items={open} onStatus={setStatus} showDate={false} />}
        </>
      )}
    </div>
  );
}
