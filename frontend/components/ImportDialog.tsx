"use client";

import { CalendarRange, FileText, Image as ImageIcon, Megaphone, X } from "lucide-react";
import { useRef, useState } from "react";
import { upload } from "@/lib/api";

type KindId = "schedule" | "syllabus" | "flyer" | "screenshot";

type Kind = { id: KindId; title: string; body: string; accept: string; path: string; icon: typeof FileText };

export const IMPORT_KINDS: Kind[] = [
  {
    id: "schedule",
    title: "Class schedule",
    body: "A screenshot of your SPIRE weekly schedule, or SPIRE's calendar export (.ics).",
    accept: "image/png,image/jpeg,image/webp,.ics,text/calendar",
    path: "/import/schedule",
    icon: CalendarRange,
  },
  {
    id: "syllabus",
    title: "Syllabus (PDF)",
    body: "Office hours, exams and due dates. Also shared on the course's page for classmates.",
    accept: "application/pdf",
    path: "/import/syllabus",
    icon: FileText,
  },
  {
    id: "flyer",
    title: "Club flyer or Instagram post",
    body: "A screenshot of a club's post or flyer. Meetings become events, sign-ups become deadlines.",
    accept: "image/png,image/jpeg,image/webp",
    path: "/import/screenshot?kind=flyer",
    icon: Megaphone,
  },
  {
    id: "screenshot",
    title: "Portal screenshot",
    body: "An enrollment appointment, housing time slot or hold from SPIRE or another portal.",
    accept: "image/png,image/jpeg,image/webp",
    path: "/import/screenshot",
    icon: ImageIcon,
  },
];

type Result = { course?: string | null; office_hours?: number; items?: number; classes?: number; courses?: string[]; term?: string | null; warning?: string | null };

function message(kind: KindId, r: Result): string {
  if (kind === "schedule") return `Added ${r.classes} class meetings${r.term ? ` for ${r.term}` : ""}: ${r.courses?.join(", ")}.`;
  if (kind === "syllabus") return r.warning ?? `${r.course ?? "Syllabus"} added: ${r.items ?? 0} dates and ${r.office_hours ?? 0} office-hour slots.`;
  if (kind === "flyer") return r.items ? `Added ${r.items} item${r.items === 1 ? "" : "s"} from the flyer.` : "No dates found on that flyer.";
  return r.items ? `Added ${r.items} item${r.items === 1 ? "" : "s"} from your screenshot.` : "That screenshot didn't have anything to add.";
}

export function ImportDialog({
  onClose,
  onImported,
  only,
  extraQuery = "",
}: {
  onClose: () => void;
  onImported: (message: string) => void;
  only?: KindId;
  extraQuery?: string;
}) {
  const [busy, setBusy] = useState<KindId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<Partial<Record<KindId, HTMLInputElement | null>>>({});
  const kinds = only ? IMPORT_KINDS.filter((k) => k.id === only) : IMPORT_KINDS;

  async function handle(kind: Kind, file: File | undefined) {
    if (!file) return;
    setBusy(kind.id);
    setError(null);
    try {
      const r = await upload<Result>(`${kind.path}${extraQuery}`, file);
      onImported(message(kind.id, r));
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-ink/40 sm:place-items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="add-title"
        className="w-full max-w-md rounded-t-2xl bg-surface p-6 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 id="add-title" className="font-display text-xl font-extrabold tracking-[-0.03em]">{only === "syllabus" ? "Add your syllabus" : "Add to OneMass"}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-paper hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg bg-maroon-50 p-3 text-sm text-maroon-800">{error}</p>}
        <div className="mt-5 divide-y divide-line-soft overflow-hidden rounded-xl border border-line">
          {kinds.map((k) => (
            <button key={k.id} disabled={busy !== null} onClick={() => inputs.current[k.id]?.click()}
              className="flex w-full items-start gap-4 px-4 py-4 text-left hover:bg-paper disabled:opacity-60">
              <k.icon className="mt-0.5 h-5 w-5 shrink-0 text-maroon-600" />
              <span>
                <span className="block font-semibold text-ink">{busy === k.id ? "Reading it…" : k.title}</span>
                <span className="mt-0.5 block text-sm leading-snug text-ink-muted">{k.body}</span>
              </span>
              <input ref={(el) => { inputs.current[k.id] = el; }} type="file" accept={k.accept} className="hidden"
                onChange={(e) => handle(k, e.target.files?.[0])} />
            </button>
          ))}
        </div>
        <p className="mt-4 text-[13px] leading-snug text-ink-muted">
          Files are read once and then deleted. Only what&apos;s pulled out of them is saved.
        </p>
      </div>
    </div>
  );
}
