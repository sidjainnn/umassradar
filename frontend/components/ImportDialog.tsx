"use client";

import { FileText, Image as ImageIcon, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { upload } from "@/lib/api";

type Props = { onClose: () => void; onImported: (message: string) => void };

type Kind = { id: "syllabus" | "screenshot"; title: string; body: string; accept: string; path: string };

const KINDS: Kind[] = [
  {
    id: "syllabus",
    title: "Syllabus (PDF)",
    body: "Pulls out office hours, exams and due dates. The PDF isn't kept.",
    accept: "application/pdf",
    path: "/import/syllabus",
  },
  {
    id: "screenshot",
    title: "Screenshot",
    body: "SPIRE enrollment appointment, housing time slot, a hold, a portal page. The image isn't kept.",
    accept: "image/png,image/jpeg,image/webp",
    path: "/import/screenshot",
  },
];

export function ImportDialog({ onClose, onImported }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handle(kind: Kind, file: File | undefined) {
    if (!file) return;
    setBusy(kind.id);
    setError(null);
    try {
      const r = await upload<{ course?: string | null; office_hours?: number; items?: number }>(kind.path, file);
      if (kind.id === "screenshot") {
        onImported(r.items ? `Added ${r.items} item${r.items === 1 ? "" : "s"} from your screenshot.` : "Nothing actionable found in that screenshot.");
        onClose();
        return;
      }
      const bits: string[] = [];
      if (r.items !== undefined) bits.push(`${r.items} dated item${r.items === 1 ? "" : "s"}`);
      if (r.office_hours !== undefined) bits.push(`${r.office_hours} office-hour slot${r.office_hours === 1 ? "" : "s"}`);
      onImported(`${r.course ?? "Imported"}: ${bits.join(", ")} added.`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-stone-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Import</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-stone-400 hover:bg-stone-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {error && <p className="mt-4 rounded-lg bg-maroon-50 p-3 text-sm text-maroon-700">{error}</p>}
        <div className="mt-4 space-y-3">
          {KINDS.map((k) => (
            <button
              key={k.id}
              disabled={busy !== null}
              onClick={() => inputs.current[k.id]?.click()}
              className="flex w-full items-start gap-3 rounded-xl border border-stone-200 p-4 text-left hover:border-maroon-500 disabled:opacity-60"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-maroon-50 text-maroon-600">
                {k.id === "syllabus" ? <FileText className="h-5 w-5" /> : <ImageIcon className="h-5 w-5" />}
              </span>
              <span>
                <span className="block font-medium">{busy === k.id ? "Reading…" : k.title}</span>
                <span className="mt-0.5 block text-sm text-stone-500">{k.body}</span>
              </span>
              <input
                ref={(el) => { inputs.current[k.id] = el; }}
                type="file"
                accept={k.accept}
                className="hidden"
                onChange={(e) => handle(k, e.target.files?.[0])}
              />
            </button>
          ))}
        </div>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-stone-400">
          <Upload className="h-3.5 w-3.5" /> Files are read once and discarded; only what&apos;s extracted is saved.
        </p>
      </div>
    </div>
  );
}
