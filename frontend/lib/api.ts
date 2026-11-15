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
  mode?: "study" | "work" | "both";
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
  needs_onboarding?: boolean;
  id: string;
  email: string;
  name: string;
  demo: boolean;
  needs_reconnect: boolean;
  gmail_granted: boolean;
  last_sync_at: string | null;
  canvas_feed_set: boolean;
  calendar_connected?: boolean;
  profile: { preferred_name: string; major: string; class_year: number | null };
  followed_groups: string[];
  has_schedule: boolean;
  member_since: string | null;
  mode?: "study" | "work";
};

export function displayName(me: Me): string {
  return me.profile?.preferred_name || me.name.split(" ")[0] || "";
}

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

export type CourseSummary = {
  code: string;
  title: string;
  term: string | null;
  credits: string | null;
  instructors: string[];
  has_syllabus: boolean;
  mine: boolean;
  planned: boolean;
};

export type Section = {
  section: string;
  class_number: string;
  days: number[];
  start: string | null;
  end: string | null;
  location: string | null;
  instructor: string | null;
  conflicts_with: string[];
  chosen: boolean;
  yours?: boolean;
};

export type CourseProfile = CourseSummary & {
  your_section_where?: (import("./features").ClassLocation & { component?: string; start: string; end: string })[];
  terms: string[];
  description: string | null;
  prerequisites: string | null;
  catalog_url: string | null;
  sections: Section[];
  shared: {
    syllabus_uploads: number;
    office_hours: { who: string; weekday: number; start: string; end: string; location: string | null }[];
    dates: { title: string; category: string; when: string; location: string | null }[];
    grading: string | null;
    late_policy: string | null;
    materials?: import("@/components/Materials").Material[];
    updated_at: string | null;
    term?: string | null;
    source_url?: string | null;
    source?: "student" | "public" | null;
  };
  your_items: Item[];
};
