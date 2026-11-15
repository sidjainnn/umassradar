import { api, type Item } from "./api";
import type { Mode } from "./mode";

export type Preferences = {
  interests: string[]; job_types: string[]; hours_per_week: number | null; min_pay: number | null;
  places: string[]; work_study: boolean | null; grad_term: string | null; skills: string[]; avoid: string[]; learn_from_email: boolean;
};
export type Question = { id: keyof Preferences; type: "tags" | "multi" | "number" | "boolean" | "text"; label: string;
  hint?: string; suggestions?: string[]; options?: { value: string; label?: string }[]; min?: number; max?: number; unit?: string; default?: boolean };
export type PreferenceData = { prefs: Preferences; needs_onboarding: boolean; onboarded_at: string | null; top_interests: string[] };
export type LearningEvent = { id: string; kind: string; label: string; title: string; source: string; at: string; terms: string[] };
export type Job = Item & { match: number; reasons: string[]; types: string[]; place: string | null; saved: boolean; hidden: boolean };
export type JobsData = { jobs: Job[]; filtered_out: { id: string; title: string; reason: string }[]; hidden: number; personalized: boolean; needs_onboarding: boolean };
export type ApplicationStage = "applied" | "interview" | "offer" | "rejected";
export type Application = { id: string; company: string; role: string | null; stage: ApplicationStage; first_at: string; last_at: string;
  days_quiet: number; history: { stage: ApplicationStage; at: string }[] };
export type SuggestionAction =
  | { type: "block_time"; label: string; title: string; starts_at: string; ends_at: string }
  | { type: "copy_text"; label: string; text: string }
  | { type: "open_job" | "open_item"; label: string; item_id: string };
export type Suggestion = { id: string; kind: string; title: string; why: string; due: string | null; item_ids: string[]; action: SuggestionAction };
export type TodoData = { mode: Mode; tasks: Item[]; suggestions: Suggestion[] };
export type Point = [number, number];
export type Entrance = { id: string; at: Point; side?: string | null; level?: string | null; wheelchair?: string | null };
export type Building = { id: string; name: string; center: Point; outline: Point[]; levels: string | number | null; entrances: Entrance[] };
export type ClassLocation = { found: boolean; raw?: string | null; reason?: string; building?: string; room?: string; floor?: number;
  summary?: string; navigate?: { to: string; label: string }; indoor?: boolean; layout?: string };
export type ClassWhere = { course: string; component?: string; section?: string; day_names: string[]; start: string; end: string; today: boolean;
  location: ClassLocation; walk_from_previous: { from: string; day: string; minutes: number; gap_minutes: number; tight: boolean; same_building: boolean } | null };
export type ClassWhereData = { term: string | null; classes: ClassWhere[] };
export type IndoorFloor = { level: number; source: "traced" | "generated"; rooms: { code: string; room: string; capacity?: number; polygon: Point[]; door?: Point }[];
  corridors: Point[][]; stairs: Point[]; elevators: Point[]; other?: { label: string; polygon: Point[] }[] };
export type IndoorBuilding = { building: string; center: Point; ground_floor: number; floors: IndoorFloor[]; entrances: Entrance[] };
export type IndoorRoute = { building: string; room: string; code: string; floor: number; source: "traced" | "generated"; found: boolean; reachable: boolean;
  minutes: number; meters: number; entrance: Entrance; legs: { level: number; line: Point[] }[]; steps: string[]; room_polygon: Point[] };
export type IndoorSummary = { building: string; id: string; center: Point; classrooms: number; floors: number[]; traced: boolean };
export type LocatedRoom = {
  query: string; building: Omit<Building, "entrances">; room: string | null;
  floor: { room: string; floor: number | null; wing: string | null; label: string | null } | null;
  confirmed: { floor: number; count: number; landmarks: string[]; entrance_id: string | null } | null;
  entrances: Entrance[]; steps: string[]; classes_here: { course: string; section: string; days: number[]; start: string; end: string; term: string }[];
  tips: string[]; source: string;
};
export type WalkingRoute = { from: string; to: string; meters: number; minutes: number; exit: Entrance | null; enter: Entrance | null; same_building: boolean };

export function objectData(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
export function listData<T>(value: unknown): value is T[] { return Array.isArray(value); }
export function preferencesData(value: unknown): value is PreferenceData { return objectData(value) && objectData(value.prefs) && Array.isArray(value.top_interests); }
export function jobsData(value: unknown): value is JobsData { return objectData(value) && Array.isArray(value.jobs) && Array.isArray(value.filtered_out); }
export function todoData(value: unknown): value is TodoData { return objectData(value) && Array.isArray(value.tasks) && Array.isArray(value.suggestions); }
export function locatedRoomData(value: unknown): value is LocatedRoom { return objectData(value) && objectData(value.building) && Array.isArray(value.building.center) && Array.isArray(value.entrances) && Array.isArray(value.steps) && Array.isArray(value.classes_here); }
export function walkingRouteData(value: unknown): value is WalkingRoute { return objectData(value) && typeof value.minutes === "number" && typeof value.meters === "number"; }
export function classWhereData(value: unknown): value is ClassWhereData { return objectData(value) && Array.isArray(value.classes); }
export function indoorBuildingData(value: unknown): value is IndoorBuilding { return objectData(value) && Array.isArray(value.floors); }
export function indoorRouteData(value: unknown): value is IndoorRoute { return objectData(value) && value.reachable === true && Array.isArray(value.legs) && Array.isArray(value.steps); }
export async function checkedApi<T>(path: string, validate: (value: unknown) => value is T, signal?: AbortSignal): Promise<T> {
  const data = await api<unknown>(path, { signal });
  if (!validate(data)) throw new Error("This service returned an unexpected response. Please try again.");
  return data;
}
export const feedback = (id: string, action: "saved" | "hidden" | "opened" | "applied" | "not_interested" | "unsave" | "unhide") =>
  api(`/jobs/${encodeURIComponent(id)}/feedback`, { method: "POST", body: JSON.stringify({ action }) });
export const decideSuggestion = (id: string, decision: "accept" | "dismiss") =>
  api<{ event_ids?: string[] }>(`/todo/suggestions/${encodeURIComponent(id)}`, { method: "POST", body: JSON.stringify({ decision }) });
export function externalUrl(value: string | null): string | null {
  try { const url = new URL(value ?? ""); return ["https:", "http:"].includes(url.protocol) ? url.href : null; } catch { return null; }
}
