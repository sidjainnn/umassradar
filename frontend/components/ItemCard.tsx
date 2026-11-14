"use client";

import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  GraduationCap,
  MapPin,
  MessageCircle,
  RotateCcw,
  Sprout,
  X,
} from "lucide-react";
import { useState } from "react";
import type { Item } from "@/lib/api";
import { CATEGORY_LABEL, isOverdue } from "@/lib/sections";
import { formatWhen, relative } from "@/lib/time";

const icons = {
  deadline: Clock3,
  appointment: CalendarDays,
  reply_owed: MessageCircle,
  status_update: Bell,
  opportunity: Sprout,
  event: CalendarDays,
  course_info: GraduationCap,
  noise: Bell,
};
type Props = {
  item: Item;
  highlighted?: boolean;
  pending?: boolean;
  compact?: boolean;
  onStatus: (id: string, status: Item["status"]) => void;
};

export function ItemCard({
  item,
  highlighted,
  pending,
  compact,
  onStatus,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const when = item.due_at ?? item.starts_at;
  const overdue = item.status === "open" && isOverdue(item);
  const done = item.status !== "open";
  const Icon = icons[item.category];
  const source =
    item.source === "canvas"
      ? "Canvas"
      : item.source === "demo"
        ? "Demo email"
        : "Gmail";
  const safeUrl = item.url && /^https?:\/\//i.test(item.url) ? item.url : null;
  return (
    <article
      id={`item-${item.id}`}
      tabIndex={-1}
      className={`radar-item ${compact ? "compact-item" : ""} ${highlighted ? "highlighted" : ""} ${done ? "completed-item" : ""}`}
      aria-busy={pending}
    >
      <div className={`item-symbol symbol-${item.category}`}>
        <Icon size={18} aria-hidden="true" />
      </div>
      <div className="item-content">
        <div className="item-kicker">
          <span>{item.course || CATEGORY_LABEL[item.category]}</span>
          {item.course && (
            <>
              <span className="kicker-dot">·</span>
              <span>{CATEGORY_LABEL[item.category]}</span>
            </>
          )}
          {overdue && <span className="overdue-badge">Overdue</span>}
        </div>
        <h3>{item.title}</h3>
        <div className="item-meta">
          {when && (
            <span
              className={overdue ? "overdue-text" : ""}
              title={formatWhen(when)}
            >
              <Clock3 size={12} aria-hidden="true" />
              {formatWhen(when)}
              <span className="relative-time"> · {relative(when)}</span>
            </span>
          )}
          {item.location && (
            <span>
              <MapPin size={12} aria-hidden="true" />
              {item.location}
            </span>
          )}
          {!when && item.sender && <span>{item.sender}</span>}
        </div>
        <div className="item-links">
          {safeUrl ? (
            <a href={safeUrl} target="_blank" rel="noreferrer">
              Open in {source}
              <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          ) : item.source === "demo" ? (
            <span className="demo-source">Sample inbox</span>
          ) : null}
          {item.evidence && (
            <button
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              aria-controls={`evidence-${item.id}`}
            >
              {expanded ? "Hide context" : "Why it’s here"}
              <ChevronDown size={12} className={expanded ? "rotate-180" : ""} />
            </button>
          )}
        </div>
        {expanded && (
          <div className="item-evidence" id={`evidence-${item.id}`}>
            <blockquote>“{item.evidence}”</blockquote>
            <p>
              {item.sender && `From ${item.sender} · `}
              {Math.round(item.confidence * 100)}% extraction confidence
            </p>
          </div>
        )}
      </div>
      <div className="item-actions">
        {done ? (
          <button
            className="icon-button"
            disabled={pending}
            aria-label={`Reopen ${item.title}`}
            title="Move back to open"
            onClick={() => onStatus(item.id, "open")}
          >
            <RotateCcw size={16} />
          </button>
        ) : (
          <>
            <button
              className="complete-button"
              disabled={pending}
              aria-label={`Mark ${item.title} done`}
              title="Mark done"
              onClick={() => onStatus(item.id, "done")}
            >
              <Check size={15} />
            </button>
            <button
              className="dismiss-button"
              disabled={pending}
              aria-label={`Dismiss ${item.title}`}
              title="Dismiss"
              onClick={() => onStatus(item.id, "dismissed")}
            >
              <X size={14} />
            </button>
          </>
        )}
      </div>
    </article>
  );
}
