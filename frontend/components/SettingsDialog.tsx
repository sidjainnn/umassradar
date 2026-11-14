"use client";

import { CalendarCheck, CalendarDays, RefreshCcw, ShieldCheck, Trash2, X } from "lucide-react";
import { useState } from "react";
import { api, type Me } from "@/lib/api";

type Props = {
  me: Me;
  onClose: () => void;
  onChanged: (message?: string) => void;
  onDeleted: () => void;
};

export function SettingsDialog({ me, onClose, onChanged, onDeleted }: Props) {
  const [feed, setFeed] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(name: string, fn: () => Promise<void>) {
    setBusy(name);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold">Settings and privacy</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-paper" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <p className="mt-4 rounded-lg bg-maroon-50 p-3 text-sm text-maroon-700">{error}</p>}

        <section className="mt-5">
          <h3 className="flex items-center gap-2 font-medium">
            <CalendarDays className="h-4 w-4 text-maroon-600" /> Canvas calendar feed
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            In Canvas, open Calendar → <em>Calendar Feed</em> and paste the link. Assignments show up as deadlines.
            {me.canvas_feed_set && <span className="font-medium text-emerald-700"> Connected.</span>}
          </p>
          <div className="mt-2 flex gap-2">
            <input
              value={feed}
              onChange={(e) => setFeed(e.target.value)}
              placeholder="https://umamherst.instructure.com/feeds/calendars/user_….ics"
              className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-maroon-600"
            />
            <button
              disabled={!feed || busy !== null || me.demo}
              onClick={() =>
                run("canvas", async () => {
                  const r = await api<{ items: number }>("/settings/canvas", {
                    method: "PUT",
                    body: JSON.stringify({ url: feed }),
                  });
                  setFeed("");
                  onChanged(`Canvas connected: ${r.items} items imported.`);
                })
              }
              className="rounded-lg bg-maroon-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy === "canvas" ? "Importing…" : "Save"}
            </button>
          </div>
        </section>

        <section className="mt-6">
          <h3 className="flex items-center gap-2 font-medium">
            <CalendarCheck className="h-4 w-4 text-maroon-600" /> Google Calendar
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            Read-only. Used to check which office hours fit around your classes; events aren&apos;t stored.
          </p>
          {me.calendar_connected ? (
            <p className="mt-2 text-sm font-medium text-emerald-700">Connected.</p>
          ) : (
            <a
              href={me.demo ? undefined : "/api/auth/login?calendar=1"}
              aria-disabled={me.demo}
              className={`mt-2 inline-block rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-paper ${me.demo ? "pointer-events-none opacity-50" : ""}`}
            >
              Connect Google Calendar
            </a>
          )}
        </section>

        <section className="mt-6">
          <h3 className="flex items-center gap-2 font-medium">
            <RefreshCcw className="h-4 w-4 text-maroon-600" /> Re-scan inbox
          </h3>
          <p className="mt-1 text-sm text-ink-muted">Re-reads the last 14 days of email from scratch. Done and dismissed items stay that way.</p>
          <button
            disabled={busy !== null || me.demo}
            onClick={() =>
              run("full", async () => {
                const r = await api<{ status: string; message?: string; new_messages?: number }>("/sync?full=true", {
                  method: "POST",
                });
                onChanged(r.message ?? `Re-scanned ${r.new_messages ?? 0} emails.`);
              })
            }
            className="mt-2 rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-paper disabled:opacity-50"
          >
            {busy === "full" ? "Re-scanning…" : "Re-scan last 14 days"}
          </button>
        </section>

        <section className="mt-6 rounded-xl bg-paper p-4 text-sm text-ink-muted">
          <h3 className="flex items-center gap-2 font-medium text-ink">
            <ShieldCheck className="h-4 w-4 text-emerald-700" /> What UMass Radar keeps
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Read-only Gmail access. We never send, delete or change email.</li>
            <li>Email bodies are never stored, only the items extracted from them and one quoted sentence as evidence.</li>
            <li>Your Google token is encrypted and never sent to the browser.</li>
          </ul>
          <button
            disabled={busy !== null}
            onClick={() => {
              if (!confirm("Delete all your UMass Radar data and sign out? This can't be undone.")) return;
              run("delete", async () => {
                await api("/account", { method: "DELETE" });
                onDeleted();
              });
            }}
            className="mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-2 font-medium text-maroon-700 hover:bg-maroon-50"
          >
            <Trash2 className="h-4 w-4" /> {busy === "delete" ? "Deleting…" : "Delete all my data"}
          </button>
        </section>
      </div>
    </div>
  );
}
