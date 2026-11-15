import { createContext, useContext } from "react";
import type { Item } from "./api";

export type Mode = "study" | "work";

/** Study mode (default) puts classes first; work mode puts jobs, shifts and applications first. */
export const ModeContext = createContext<Mode>("study");
export const useMode = () => useContext(ModeContext);

const JOB = /\b(job|jobs|shift|shifts|interview|hiring|hire|handshake|application|applied|apply|offer|recruit\w*|intern(ship)?|resume|career|employ\w*|payroll|timesheet|work[- ]study|position|RA\b|PM\b)/i;

export function isJob(i: Item): boolean {
  return i.category === "opportunity" || JOB.test(`${i.title} ${i.sender ?? ""}`);
}
