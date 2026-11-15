import * as chrono from "chrono-node";

/** What the Schedule command bar understood from a line like "Study group thu 7-9pm at Du Bois". */
export type QuickEvent = {
  title: string;
  start: Date;
  end: Date | null;
  allDay: boolean;
  location: string | null;
  course: string | null;
  /** weekdays (0 = Monday) to repeat on, weekly */
  repeatDays: number[];
  repeatUntil: Date | null;
};

const WEEKDAY = /\b(mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?:day|nesday|sday|rsday|urday)?s?\b/gi;
const DAY_INDEX: Record<string, number> = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };

const DEPT_ALIASES: Record<string, string> = { CS: "COMPSCI", CICS: "CICS", ECE: "ECE", MATH: "MATH", STAT: "STAT", STATS: "STAT" };
const DEPTS = new Set([
  "COMPSCI", "CICS", "INFO", "MATH", "STAT", "ECE", "PHYSICS", "CHEM", "BIOLOGY", "BIOCHEM", "ECON", "PSYCH", "ENGLWRIT",
  "ENGLISH", "HISTORY", "POLISCI", "SOCIOL", "COMM", "MGMT", "ACCOUNTG", "FINANCE", "MARKETNG", "SPORTMGT", "HTM", "NURSING",
  "KIN", "PUBHLTH", "LINGUIST", "PHIL", "ANTHRO", "GEO", "GEOGRAPH", "CHE", "ME", "MIE", "CEE", "EDUC", "ART", "MUSIC", "FRENCHST",
  "SPANISH", "JAPANESE", "CHINESE", "GERMAN", "ITALIAN", "RES-ECON", "ENVIRSCI", "FOODSCI", "NUTRITN", "ASTRON", "MICROBIO",
]);

function nextWeekday(day: number, from: Date): Date {
  const d = new Date(from);
  const today = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() + ((day - today + 7) % 7));
  return d;
}

function findCourse(text: string, known: string[]): { code: string; match: string } | null {
  for (const code of known) {
    const rx = new RegExp(`\\b${code.replace(" ", "\\s?")}\\b`, "i");
    const m = text.match(rx);
    if (m) return { code, match: m[0] };
  }
  const m = text.match(/\b([A-Za-z]{2,8})\s?(\d{3}[A-Za-z]?)\b/);
  if (!m) return null;
  const dept = DEPT_ALIASES[m[1].toUpperCase()] ?? m[1].toUpperCase();
  return DEPTS.has(dept) ? { code: `${dept} ${m[2].toUpperCase()}`, match: m[0] } : null;
}

/**
 * Parse a quick-add line. Returns null when there's no date or time in it, which means the
 * line is a search, not a new event.
 */
export function parseQuickAdd(input: string, now: Date = new Date(), knownCourses: string[] = []): QuickEvent | null {
  let text = ` ${input.trim()} `;
  if (text.trim().length < 3) return null;

  // "every tue and thu until dec 10"
  let repeatDays: number[] = [];
  let repeatUntil: Date | null = null;
  const until = text.match(/\buntil\s+(.+?)(?=\s+(?:at|@|in)\s|\s*$)/i);
  if (until) {
    repeatUntil = chrono.parseDate(until[1], now, { forwardDate: true });
    if (repeatUntil) text = text.replace(until[0], " ");
  }
  const every = text.match(/\bevery\s+((?:(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\s*(?:,|and|&|\/)?\s*)+)/i);
  if (every) {
    repeatDays = [...new Set([...every[1].matchAll(WEEKDAY)].map((m) => DAY_INDEX[m[1].slice(0, 3).toLowerCase()]))].sort();
    text = text.replace(every[0], " ");
  }

  // "for 30 min" / "for 2 hours"
  let minutes: number | null = null;
  const dur = text.match(/\bfor\s+(\d+(?:\.\d+)?)\s*(m|min|mins|minutes|h|hr|hrs|hour|hours)\b/i);
  if (dur) {
    minutes = Number(dur[1]) * (dur[2].toLowerCase().startsWith("h") ? 60 : 1);
    text = text.replace(dur[0], " ");
  }

  const results = chrono.parse(text, now, { forwardDate: true });
  const hit = results[0];
  if (!hit && !repeatDays.length) return null;

  let start: Date;
  let end: Date | null = null;
  let allDay = false;
  if (hit) {
    start = hit.start.date();
    end = hit.end?.date() ?? null;
    allDay = !hit.start.isCertain("hour");
    text = text.replace(hit.text, " ");
    if (repeatDays.length && !hit.start.isCertain("weekday") && !hit.start.isCertain("day")) {
      const first = nextWeekday(repeatDays[0], now);
      start = new Date(first.getFullYear(), first.getMonth(), first.getDate(), start.getHours(), start.getMinutes());
      if (end) end = new Date(start.getTime() + (hit.end!.date().getTime() - hit.start.date().getTime()));
    }
  } else {
    const first = nextWeekday(repeatDays[0], now);
    start = new Date(first.getFullYear(), first.getMonth(), first.getDate());
    allDay = true;
  }
  if (allDay) {
    start = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    end = new Date(start.getTime() + 86_400_000);
  } else if (minutes) {
    end = new Date(start.getTime() + minutes * 60_000);
  } else if (end && end <= start) {
    end = new Date(end.getTime() + 86_400_000); // "11pm-1am"
  }

  // place: "at Roots", "@ Du Bois", "in ILC S240"
  let location: string | null = null;
  const loc = text.match(/\s(?:at|@|in)\s+([^,]+?)\s*$/i);
  if (loc && loc[1].trim().length > 1) {
    location = loc[1].trim();
    text = text.replace(loc[0], " ");
  }

  const course = findCourse(text, knownCourses);
  let title = text.replace(/\s+/g, " ").trim().replace(/\s+(?:on|at|from|@|,)$/i, "").replace(/^(?:on|at)\s+/i, "");
  if (!title) title = course?.code ? `${course.code}` : "New event";
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return { title, start, end, allDay, location, course: course?.code ?? null, repeatDays, repeatUntil };
}
