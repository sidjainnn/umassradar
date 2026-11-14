export type Category =
  | "deadline"
  | "appointment"
  | "reply_owed"
  | "status_update"
  | "opportunity"
  | "event"
  | "course_info"
  | "noise";

export type Item = {
  id: string;
  category: Category;
  title: string;
  course: string | null;
  due_at: string | null;
  starts_at: string | null;
  location: string | null;
  action_required: boolean;
  urgency_score: number;
  source: string;
  source_ref: string;
  evidence: string;
  confidence: number;
  extracted_by: "rule" | "llm";
  created_at: string;
  status: "open" | "done" | "dismissed";
  sender: string;
  sender_type: string;
  received_at: string | null;
  url: string | null;
};

export type Me = {
  id: string;
  email: string;
  name: string;
  demo: boolean;
  needs_reconnect: boolean;
  gmail_granted: boolean;
  last_sync_at: string | null;
  canvas_feed_set: boolean;
  calendar_connected?: boolean;
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}

export type OfficeHourSlot = {
  course: string | null;
  who: string;
  location: string | null;
  evidence: string;
  starts_at: string;
  ends_at: string;
  can_make?: boolean | null;
};

/** multipart upload to the API (no JSON content-type, so the browser sets the boundary) */
export async function upload<T>(path: string, file: File): Promise<T> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(`/api${path}`, { method: "POST", body, credentials: "include" });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}
