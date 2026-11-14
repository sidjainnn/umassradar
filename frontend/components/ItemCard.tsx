"use client";

import { Check, ExternalLink, MapPin, RotateCcw, Sparkles, X } from "lucide-react";
import type { Item } from "@/lib/api";
import { CATEGORY_LABEL, CATEGORY_STYLE, isOverdue } from "@/lib/sections";
import { formatWhen, relative } from "@/lib/time";

type Props = {
  item: Item;
  highlighted?: boolean;
  onStatus: (id: string, status: Item["status"]) => void;
};

function sourceLabel(item: Item): string {
  if (item.source === "canvas") return "Open in Canvas";
  if (item.source === "web") return "Open page";
  if (item.source === "demo") return "Demo email";
  return "Open in Gmail";
}

export function ItemCard({ item, highlighted, onStatus }: Props) {
  const when = item.due_at ?? item.starts_at;
  const overdue = isOverdue(item);
  const done = item.status !== "open";

  return (
    <article
      id={`item-${item.id}`}
      className={`group rounded-xl border bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-md ${
        highlighted ? "border-maroon-500 ring-2 ring-maroon-200" : "border-stone-200"
      } ${done ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className={`rounded-full px-2 py-0.5 font-medium ring-1 ring-inset ${CATEGORY_STYLE[item.category]}`}>
              {CATEGORY_LABEL[item.category]}
            </span>
            {item.course && (
              <span className="rounded-full bg-stone-900 px-2 py-0.5 font-medium text-white">{item.course}</span>
            )}
            {item.action_required && !done && (
              <span className="font-medium text-maroon-600">Action needed</span>
            )}
            {item.extracted_by === "llm" && (
              <span title={`Read by AI · ${Math.round(item.confidence * 100)}% confident`} className="text-stone-400">
                <Sparkles className="inline h-3 w-3" />
              </span>
            )}
          </div>

          <h3 className={`mt-1.5 font-semibold leading-snug text-stone-900 ${done ? "line-through" : ""}`}>
            {item.title}
          </h3>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-600">
            {when && (
              <span className={overdue ? "font-medium text-maroon-600" : ""}>
                {overdue ? "Overdue · " : ""}
                {formatWhen(when)}
                <span className="text-stone-400"> · {relative(when)}</span>
              </span>
            )}
            {item.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {item.location}
              </span>
            )}
            {item.sender && <span className="truncate text-stone-400">from {item.sender}</span>}
          </div>

          {item.evidence && item.evidence !== item.title && (
            <blockquote className="mt-2.5 border-l-2 border-stone-200 pl-3 text-sm italic text-stone-500">
              “{item.evidence}”
            </blockquote>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
          {done ? (
            <IconButton label="Move back to open" onClick={() => onStatus(item.id, "open")}>
              <RotateCcw className="h-4 w-4" />
            </IconButton>
          ) : (
            <>
              <IconButton label="Mark done" onClick={() => onStatus(item.id, "done")}>
                <Check className="h-4 w-4" />
              </IconButton>
              <IconButton label="Dismiss" onClick={() => onStatus(item.id, "dismissed")}>
                <X className="h-4 w-4" />
              </IconButton>
            </>
          )}
        </div>
      </div>

      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-maroon-600 hover:underline"
        >
          {sourceLabel(item)} <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </article>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-900"
    >
      {children}
    </button>
  );
}
