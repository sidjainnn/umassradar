"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Item } from "@/lib/api";
import type { BriefData } from "@/lib/store";

const WAITING_LINES = [
  "Reading your inbox so you don't have to",
  "Sorting Piazza noise from actual deadlines",
  "Bribing Gemini with a Blue Wall coffee",
  "Turning 300 emails into three sentences",
  "Checking which professors are waiting on you",
];

export function pageFor(item: Item): string {
  if (item.category === "opportunity") return "/opportunities";
  if (["status_update", "course_info"].includes(item.category)) return "/updates";
  return "/todo";
}

/** The brief as a short paragraph. Shows the instant version while Gemini writes the better one. */
export function BriefText({ brief, items }: { brief: BriefData | null; items: Item[] }) {
  const [line, setLine] = useState(0);
  const writing = !brief || !brief.fresh;

  useEffect(() => {
    if (!writing) return;
    const t = setInterval(() => setLine((n) => (n + 1) % WAITING_LINES.length), 1800);
    return () => clearInterval(t);
  }, [writing]);

  const byId = new Map(items.map((i) => [i.id, i]));

  return (
    <div className="border-l-[3px] border-maroon-600 pl-5">
      {brief ? (
        <p className={`max-w-[62ch] font-serif text-[17px] leading-[1.7] text-ink transition-opacity duration-500 ${writing ? "opacity-70" : ""}`}>
          {brief.sentences.map((s, i) => {
            const target = s.item_ids.map((id) => byId.get(id)).find(Boolean);
            return (
              <span key={i}>
                {target ? (
                  <Link href={`${pageFor(target)}?focus=${target.id}`} className="decoration-maroon-200 underline-offset-4 hover:underline">
                    {s.text}
                  </Link>
                ) : (
                  s.text
                )}{" "}
              </span>
            );
          })}
        </p>
      ) : (
        <div className="space-y-2.5" aria-hidden>
          <div className="h-4 w-11/12 animate-pulse rounded bg-line" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-line" />
        </div>
      )}
      {writing && (
        <p role="status" className="mt-3 flex items-center gap-2 text-[13px] text-ink-muted">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-maroon-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-maroon-600" />
          </span>
          {WAITING_LINES[line]}…
        </p>
      )}
    </div>
  );
}
