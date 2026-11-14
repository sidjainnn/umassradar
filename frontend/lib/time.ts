export const TZ = "America/New_York";

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const weekdayFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" });
const dateFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", month: "short", day: "numeric" });
const hourFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", hour12: false });

/** "YYYY-MM-DD" for a date in Eastern time. */
export function dayKey(d: Date): string {
  return dayFmt.format(d);
}

export function daysBetween(a: Date, b: Date): number {
  const ka = new Date(dayKey(a) + "T00:00:00Z").getTime();
  const kb = new Date(dayKey(b) + "T00:00:00Z").getTime();
  return Math.round((kb - ka) / 86_400_000);
}

export function clock(d: Date): string {
  return timeFmt.format(d).replace(":00", "");
}

/** "Today 11:59 PM", "Tomorrow 2 PM", "Fri 5 PM" (this week), "Tue, Dec 1 · 5 PM". */
export function formatWhen(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const diff = daysBetween(now, d);
  if (diff === 0) return `Today ${clock(d)}`;
  if (diff === 1) return `Tomorrow ${clock(d)}`;
  if (diff === -1) return `Yesterday ${clock(d)}`;
  if (diff > 1 && diff < 7) return `${weekdayFmt.format(d)} ${clock(d)}`;
  return `${dateFmt.format(d)} · ${clock(d)}`;
}

/** "in 45 min", "in 3 h", "2 h ago", "in 4 days". */
export function relative(iso: string, now: Date = new Date()): string {
  const ms = new Date(iso).getTime() - now.getTime();
  const abs = Math.abs(ms);
  const mins = Math.round(abs / 60_000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);
  const text = mins < 60 ? `${mins} min` : hours < 36 ? `${hours} h` : `${days} days`;
  return ms >= 0 ? `in ${text}` : `${text} ago`;
}

export function easternHour(now: Date = new Date()): number {
  return Number(hourFmt.format(now)) % 24;
}

export function greeting(now: Date = new Date()): string {
  const h = easternHour(now);
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function longDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long", month: "long", day: "numeric" }).format(now);
}
