"use client";

import { Sparkles } from "lucide-react";
import { greeting, longDate } from "@/lib/time";

export type BriefData = {
  sentences: { text: string; item_ids: string[] }[];
  generated_by: "llm" | "template";
  generated_at: string;
};

type Props = {
  name: string;
  brief: BriefData | null;
  onJump: (id: string) => void;
};

export function Brief({ name, brief, onJump }: Props) {
  const first = name.split(" ")[0];
  return (
    <section className="relative overflow-hidden rounded-2xl bg-maroon-600 p-6 text-white shadow-lg sm:p-7">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border-[28px] border-white/5" />
      <div className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 rounded-full border-[14px] border-white/5" />
      <p className="text-sm font-medium text-maroon-100">{longDate()}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
        {greeting()}
        {first ? `, ${first}` : ""}.
      </h1>
      {brief ? (
        <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-maroon-50">
          {brief.sentences.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-white/60" />
              <span>
                {s.text}
                {s.item_ids.map((id, n) => (
                  <button
                    key={id}
                    onClick={() => onJump(id)}
                    className="ml-1.5 rounded-md bg-white/15 px-1.5 py-0.5 align-middle text-xs font-medium hover:bg-white/25"
                  >
                    view{s.item_ids.length > 1 ? ` ${n + 1}` : ""}
                  </button>
                ))}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 space-y-2">
          <div className="h-4 w-4/5 animate-pulse rounded bg-white/15" />
          <div className="h-4 w-3/5 animate-pulse rounded bg-white/15" />
        </div>
      )}
      {brief?.generated_by === "llm" && (
        <p className="mt-4 inline-flex items-center gap-1 text-xs text-maroon-100/80">
          <Sparkles className="h-3 w-3" /> Written from your items only, never from raw email.
        </p>
      )}
    </section>
  );
}
