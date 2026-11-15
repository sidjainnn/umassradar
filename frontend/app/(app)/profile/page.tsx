"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHeader } from "@/components/Page";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import { relative } from "@/lib/time";
import { LearningLog } from "@/components/PreferencesPanel";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[22px] border border-line-soft bg-surface shadow-[0_18px_40px_-30px_rgba(60,0,20,0.4)] px-5 py-5 sm:px-6">
      <h2 className="font-display text-lg font-extrabold tracking-[-0.03em] text-ink">{title}</h2>
      <div className="mt-3 text-[15px] text-ink-soft">{children}</div>
    </section>
  );
}

function Row({ label, value, action }: { label: string; value: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
      <span className="font-semibold text-ink">{label}</span>
      <span className="flex items-baseline gap-4 text-ink-muted">{value}{action}</span>
    </div>
  );
}

export default function ProfilePage() {
  const { me, schedule, reloadMe, reload, setNotice, signOut } = useStore();
  const [name, setName] = useState(me.profile?.preferred_name ?? "");
  const [major, setMajor] = useState(me.profile?.major ?? "");
  const [year, setYear] = useState(me.profile?.class_year ? String(me.profile.class_year) : "");
  const [feed, setFeed] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(null); }
  }

  const saveProfile = () => run("profile", async () => {
    await api("/me/profile", { method: "PATCH", body: JSON.stringify({ preferred_name: name, major, class_year: year ? Number(year) : null }) });
    await reloadMe();
    setNotice("Profile saved.");
  });

  const unfollow = (group: string) => run(`g-${group}`, async () => {
    await api(`/groups/follow?name=${encodeURIComponent(group)}`, { method: "DELETE" });
    await reloadMe();
    reload();
  });

  const input = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-[15px] text-ink outline-none focus:border-maroon-600";
  const thisYear = new Date().getFullYear();

  return (
    <div className="max-w-2xl space-y-5 pb-16">
      <PageHeader title="Profile" subtitle={me.demo ? "This is the demo student. Sign in to save your own." :
        `Signed in as ${me.email}${me.member_since ? `, using UMass Radar since ${new Date(me.member_since).toLocaleDateString("en-US", { month: "long", year: "numeric" })}` : ""}.`} />
      {error && <p role="alert" className="rounded-lg bg-maroon-50 px-4 py-3 text-sm text-maroon-800">{error}</p>}

      <Section title="Job matches and applications">
        <p>Set your work interests, review what shaped your matches, and track your applications.</p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold text-maroon-700">
          <Link href="/preferences" className="underline">Preferences and learning history</Link>
          <Link href="/applications" className="underline">Application tracker</Link>
        </div>
      </Section>

      <Section title="About you">
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_8rem]">
          <label className="block text-sm font-semibold text-ink">What should we call you?
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sid" className={`mt-1 font-normal ${input}`} />
          </label>
          <label className="block text-sm font-semibold text-ink">Major
            <input value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Computer Science" className={`mt-1 font-normal ${input}`} />
          </label>
          <label className="block text-sm font-semibold text-ink">Class of
            <select value={year} onChange={(e) => setYear(e.target.value)} className={`mt-1 font-normal ${input}`}>
              <option value="">Pick one</option>
              {Array.from({ length: 7 }, (_, i) => thisYear - 1 + i).map((y) => <option key={y}>{y}</option>)}
            </select>
          </label>
        </div>
        <button onClick={saveProfile} disabled={busy !== null || me.demo}
          className="mt-4 rounded-full bg-maroon-600 px-4 py-2 text-sm font-semibold text-white hover:bg-maroon-700 disabled:opacity-40">
          {busy === "profile" ? "Saving…" : "Save"}
        </button>
      </Section>

      <Section title="Connected accounts">
        <Row label="UMass Gmail" value={me.demo ? "Demo inbox" : me.needs_reconnect ? "Needs reconnecting" : me.last_sync_at ? `Checked ${relative(me.last_sync_at)}` : "Connected"}
          action={me.needs_reconnect ? <a href="/api/auth/login?consent=1" className="font-semibold text-maroon-600 hover:underline">Reconnect</a> : undefined} />
        <Row label="Google Calendar" value={me.calendar_connected ? "Connected, read-only" : "Not connected"}
          action={!me.calendar_connected && !me.demo ? <a href="/api/auth/login?calendar=1" className="font-semibold text-maroon-600 hover:underline">Connect</a> : undefined} />
        <div className="border-t border-line-soft pt-3">
          <span className="font-semibold text-ink">Canvas calendar feed</span>
          <span className="ml-3 text-ink-muted">{me.canvas_feed_set ? "Connected" : "Not connected"}</span>
          <p className="mt-1 text-sm text-ink-muted">In Canvas, open Calendar, then Calendar Feed, and paste the link here.</p>
          <div className="mt-2 flex gap-2">
            <input value={feed} onChange={(e) => setFeed(e.target.value)} placeholder="https://umamherst.instructure.com/feeds/calendars/…" className={input} />
            <button disabled={!feed || busy !== null || me.demo}
              onClick={() => run("canvas", async () => {
                const r = await api<{ items: number }>("/settings/canvas", { method: "PUT", body: JSON.stringify({ url: feed }) });
                setFeed(""); await reloadMe(); reload(); setNotice(`Canvas connected: ${r.items} items added.`);
              })}
              className="shrink-0 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink-soft hover:border-ink-faint disabled:opacity-40">
              {busy === "canvas" ? "Adding…" : "Connect"}
            </button>
          </div>
        </div>
      </Section>

      <Section title="What UMass Radar remembers">
        <Row label="Class schedule" value={schedule ? `${schedule.classes.length} class meetings${schedule.term ? `, ${schedule.term}` : ""}` : "Not added"}
          action={<Link href="/schedule" className="font-semibold text-maroon-600 hover:underline">{schedule ? "View" : "Add"}</Link>} />
        <Row label="Clubs and organizations you follow" value={me.followed_groups.length ? `${me.followed_groups.length}` : "None yet"}
          action={<Link href="/opportunities?tab=clubs" className="font-semibold text-maroon-600 hover:underline">Find clubs</Link>} />
        {me.followed_groups.length > 0 && (
          <ul className="mb-3 flex flex-wrap gap-2">
            {me.followed_groups.map((g) => (
              <li key={g} className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-sm text-ink-soft">
                {g}
                <button onClick={() => unfollow(g)} disabled={busy !== null} aria-label={`Unfollow ${g}`} className="text-ink-faint hover:text-maroon-600">×</button>
              </li>
            ))}
          </ul>
        )}
        <Row label="Done and dismissed items" value="Kept, so they don't come back" />
        <Row label="Stay signed in" value="For the semester on this device" />
        {!me.demo && (
          <Row label="Re-read your email" value="Last 14 days, from scratch"
            action={<button disabled={busy !== null} onClick={() => run("rescan", async () => {
              const r = await api<{ message?: string; new_messages?: number }>("/sync?full=true", { method: "POST" });
              reload(); setNotice(r.message ?? `Re-read ${r.new_messages ?? 0} emails.`);
            })} className="font-semibold text-maroon-600 hover:underline">{busy === "rescan" ? "Reading…" : "Re-read"}</button>} />
        )}
      </Section>

      <LearningLog />
      <Section title="Privacy">
        <ul className="list-disc space-y-1.5 pl-5 text-[15px]">
          <li>Gmail and Calendar access are read-only. Nothing is sent, changed or deleted.</li>
          <li>Email bodies aren&apos;t stored, only the items found in them and one quoted sentence each.</li>
          <li>Uploaded syllabi, schedules and screenshots are read once and deleted.</li>
          <li>Your Google token is encrypted and never reaches the browser.</li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-5 text-sm font-semibold">
          <button onClick={signOut} className="text-ink-soft hover:text-ink">{me.demo ? "Leave the demo" : "Sign out on this device"}</button>
          <button disabled={busy !== null}
            onClick={() => { if (confirm("Delete everything UMass Radar has saved about you and sign out? This can't be undone.")) run("delete", async () => { await api("/account", { method: "DELETE" }); signOut(); }); }}
            className="text-maroon-700 hover:underline">
            {busy === "delete" ? "Deleting…" : "Delete all my data"}
          </button>
        </div>
      </Section>
    </div>
  );
}
