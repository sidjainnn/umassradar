import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * The backend. In the iOS Simulator, localhost works; on a phone, set EXPO_PUBLIC_API_URL to a URL the phone can reach
 * (for example the web app's tunnel plus /api, which proxies to the backend).
 */
export const API = (process.env.EXPO_PUBLIC_API_URL || (Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000")).replace(/\/$/, "");

const KEY = "umassradar.session";
let token: string | null = null;

export async function loadToken() {
  token = Platform.OS === "web" ? globalThis.localStorage?.getItem(KEY) ?? null : await SecureStore.getItemAsync(KEY);
  return token;
}

export async function saveToken(t: string | null) {
  token = t;
  if (Platform.OS === "web") {
    if (t) globalThis.localStorage?.setItem(KEY, t); else globalThis.localStorage?.removeItem(KEY);
  } else if (t) await SecureStore.setItemAsync(KEY, t);
  else await SecureStore.deleteItemAsync(KEY);
}

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "ngrok-skip-browser-warning": "1",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try { msg = (await res.json()).detail ?? msg; } catch { /* not json */ }
    throw new ApiError(res.status, typeof msg === "string" ? msg : "Something went wrong.");
  }
  return res.json() as Promise<T>;
}

// ---- shapes the screens use ----
export type LatLon = [number, number];
export type Me = { id: string; name: string; demo: boolean; mode: "study" | "work"; profile?: { preferred_name?: string } };
export type Where = {
  found: boolean; raw?: string; reason?: string; building?: string; room?: string; floor?: number; floor_label?: string;
  side?: string; summary?: string; center?: LatLon; navigate?: { to: string; label: string }; layout?: string;
};
export type ClassWhere = {
  course: string; component?: string; day_names: string[]; days: number[]; start: string; end: string; today: boolean;
  location: Where; walk_from_previous: null | { from: string; minutes: number; gap_minutes: number; tight: boolean };
};
export type Route = {
  building: string; room: string; code: string; floor: number; source: "traced" | "generated"; minutes: number; meters: number;
  entrance: { id: string; at: LatLon; level: number }; legs: { level: number; line: LatLon[] }[]; steps: string[];
  room_polygon: LatLon[];
};
export type IndoorBuilding = {
  building: string; center: LatLon;
  floors: { level: number; source: string; rooms: { code: string; room: string; capacity: number; polygon: LatLon[] }[] }[];
};
export type Outline = { id: string; name: string; center: LatLon; outline: LatLon[] };
