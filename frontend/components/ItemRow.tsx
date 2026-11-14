"use client";

import { Check, ChevronDown, ExternalLink, MapPin, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import type { Category, Item } from "@/lib/api";
import { isOverdue } from "@/lib/sections";
import { formatWhen, relative } from "@/lib/time";

export const CATEGORY_DOT: Record<Category, string> = {
  deadline: "bg-maroon-600",
  appointment: "bg-navy",
  reply_owed: "bg-gold",
  event: "bg-teal",
  opportunity: "bg-forest",
  status_update: "bg-ink-faint",
  course_info: "bg-ink-faint",
  noise: "bg-line",
};

const CATEGORY_NAME: Record<Category, string> = {
  deadline: "Due",
  appointment: "Appointment",
  reply_owed: "Reply owed",
  event: "Event",
  opportunity: "Opportunity",
  status_update: "Update",
  course_info: "Course news",
  noise: "Filtered",
};

function sourceLink(item: Item): string | null {
  if (!item.url) return null;
  if (item.source === "canvas") return "Open in Canvas";
  if (item.source === "web") return "Open the page";
  return "Open the email";
}

type Props = {
  item: Item;
  onStatus: (id: string, status: Item["status"]) => void;
  showDate?: boolean;
  highlighted?: boolean;
};

/** One item as a quiet list row. Evidence, source link and dismiss live behind "Details". */
export function ItemRow({ item, onStatus, showDate = true, highlighted }: Props) {
  const [open, setOpen] = useState(false);
  const when = item.due_at ?? item.starts_at;
  const overdue = isOverdue(item);
  const done = item.status !== "open";

  return (
    <li id={`item-${item.id}`} className={`group px-4 py-3.5 sm:px-5 ${highlighted ? "bg-maroon-50" : ""}`}>
      <div className="flex items-start gap-3.5">
        <button
          onClick={() => onStatus(item.id, done ? "open" : "done")}
          aria-label={done ? "Mark as not done" : "Mark as done"}
          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.5px] transition ${
            done ? "border-maroon-600 bg-maroon-600 text-white" : "border-ink-faint text-transparent hover:border-maroon-600 hover:text-maroon-600"
          }`}
        >
          {done ? <RotateCcw className="h-3 w-3" /> : <Check className="h-3 w-3" strokeWidth={3} />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-4">
            <p className={`text-[15px] font-semibold leading-snug text-ink ${done ? "text-ink-faint line-through" : ""}`}>
              {item.title}
            </p>
            {showDate && when && (
              <time
                dateTime={when}
                title={relative(when)}
                className={`shrink-0 text-sm tabular-nums ${overdue ? "font-semibold text-maroon-600" : "text-ink-muted"}`}
              >
                {overdue ? "Overdue" : formatWhen(when)}
              </time>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${CATEGORY_DOT[item.category]}`} />
              {CATEGORY_NAME[item.category]}
            </span>
            {item.course && <span className="font-semibold text-ink-soft">{item.course}</span>}
            {item.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {item.location}
              </span>
            )}
            <button
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="inline-flex items-center gap-0.5 text-ink-faint hover:text-ink"
            >
              Details <ChevronDown className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`} />
            </button>
          </div>

          {open && (
            <div className="mt-3 space-y-2.5 border-l-2 border-line pl-3 text-sm">
              {item.evidence && <p className="font-serif italic leading-relaxed text-ink-soft">“{item.evidence}”</p>}
              <p className="text-[13px] text-ink-muted">
                From {item.sender || "an email"}
                {item.extracted_by === "llm" ? `, read by AI (${Math.round(item.confidence * 100)}% sure)` : ""}
              </p>
              <div className="flex flex-wrap gap-4 text-[13px] font-semibold">
                {sourceLink(item) && (
                  <a href={item.url!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-maroon-600 hover:underline">
                    {sourceLink(item)} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {!done && (
                  <button onClick={() => onStatus(item.id, "dismissed")} className="inline-flex items-center gap-1 text-ink-muted hover:text-ink">
                    <X className="h-3.5 w-3.5" /> Not relevant
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/** A titled group of rows on one surface. */
export function ItemList({
  title,
  items,
  onStatus,
  empty,
  showDate,
}: {
  title?: string;
  items: Item[];
  onStatus: Props["onStatus"];
  empty?: string;
  showDate?: boolean;
}) {
  return (
    <section>
      {title && <h2 className="mb-2 text-[15px] font-semibold text-ink-soft">{title}</h2>}
      {items.length === 0 ? (
        empty ? <p className="rounded-xl border border-dashed border-line px-5 py-6 text-sm text-ink-muted">{empty}</p> : null
      ) : (
        <ul className="divide-y divide-line-soft overflow-hidden rounded-xl border border-line bg-surface">
          {items.map((i) => (
            <ItemRow key={i.id} item={i} onStatus={onStatus} showDate={showDate} />
          ))}
        </ul>
      )}
    </section>
  );
}
