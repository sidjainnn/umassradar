import type { Category, Item } from "./api";
import { daysBetween } from "./time";

export type SectionId = "next" | "today" | "week" | "opportunities" | "waiting" | "courses" | "later";

export const SECTIONS: { id: SectionId; title: string; hint: string }[] = [
  { id: "next", title: "Coming up next", hint: "Next 3 hours" },
  { id: "today", title: "Today", hint: "Due or happening today" },
  { id: "week", title: "This week", hint: "Next 7 days" },
  { id: "opportunities", title: "Opportunities", hint: "Jobs, research, RA/PM, clubs" },
  { id: "waiting", title: "Waiting on", hint: "Replies you owe and applications in limbo" },
  { id: "courses", title: "Course updates", hint: "Announcements, grades, submissions" },
  { id: "later", title: "Later", hint: "More than a week out" },
];

const TIMED: Category[] = ["deadline", "appointment", "event", "reply_owed"];

export function whenOf(item: Item): Date | null {
  const iso = item.due_at ?? item.starts_at;
  return iso ? new Date(iso) : null;
}

export function isOverdue(item: Item, now: Date = new Date()): boolean {
  const when = whenOf(item);
  return item.category === "deadline" && !!when && when < now;
}

function isStaleApplication(item: Item, now: Date): boolean {
  if (item.category !== "status_update" || !/appl/i.test(item.title) || !item.received_at) return false;
  return daysBetween(new Date(item.received_at), now) >= 14;
}

/** Each item lands in exactly one section. */
export function sectionFor(item: Item, now: Date = new Date()): SectionId | null {
  if (item.category === "noise") return null;
  const when = whenOf(item);
  if (item.category === "reply_owed" && !when) return "waiting";
  if (isStaleApplication(item, now)) return "waiting";

  if (when && TIMED.includes(item.category)) {
    const hoursAway = (when.getTime() - now.getTime()) / 3_600_000;
    const dayDiff = daysBetween(now, when);
    if (hoursAway < -48) return item.category === "deadline" ? null : "courses"; // long past
    if (hoursAway >= -0.5 && hoursAway <= 3) return "next";
    if (dayDiff <= 0) return "today"; // includes overdue from yesterday
    if (dayDiff <= 7) return "week";
    return "later";
  }
  if (item.category === "opportunity") return "opportunities";
  return "courses";
}

export function groupItems(items: Item[], now: Date = new Date()): Record<SectionId, Item[]> {
  const groups = Object.fromEntries(SECTIONS.map((s) => [s.id, [] as Item[]])) as Record<SectionId, Item[]>;
  for (const item of items) {
    const id = sectionFor(item, now);
    if (id) groups[id].push(item);
  }
  const byWhen = (a: Item, b: Item) => (whenOf(a)?.getTime() ?? Infinity) - (whenOf(b)?.getTime() ?? Infinity);
  for (const id of ["next", "today", "week", "later"] as SectionId[]) groups[id].sort(byWhen);
  groups.opportunities.sort((a, b) => b.urgency_score - a.urgency_score);
  groups.courses.sort((a, b) => (b.received_at ?? "").localeCompare(a.received_at ?? ""));
  return groups;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  deadline: "Deadline",
  appointment: "Appointment",
  reply_owed: "Reply owed",
  status_update: "Update",
  opportunity: "Opportunity",
  event: "Event",
  course_info: "Course info",
  noise: "Noise",
};

export const CATEGORY_STYLE: Record<Category, string> = {
  deadline: "bg-maroon-50 text-maroon-700 ring-maroon-200",
  appointment: "bg-sky-50 text-sky-800 ring-sky-200",
  reply_owed: "bg-amber-50 text-amber-800 ring-amber-200",
  status_update: "bg-stone-100 text-stone-700 ring-stone-200",
  opportunity: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  event: "bg-violet-50 text-violet-800 ring-violet-200",
  course_info: "bg-stone-100 text-stone-700 ring-stone-200",
  noise: "bg-stone-100 text-stone-500 ring-stone-200",
};

export function matchesSearch(item: Item, q: string): boolean {
  if (!q) return true;
  const hay = [item.title, item.course, item.evidence, item.sender, item.location].join(" ").toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((word) => hay.includes(word));
}
