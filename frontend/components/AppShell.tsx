"use client";

import { BedDouble, BookOpen, Briefcase, CalendarDays, GraduationCap, House, Inbox, ListChecks, LogOut, Map as MapIcon, Plus, RefreshCw, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { displayName } from "@/lib/api";
import { useStore } from "@/lib/store";
import { relative } from "@/lib/time";
import { AskSam } from "./AskSam";
import { ImportDialog } from "./ImportDialog";
import { Logo } from "./Logo";
import { Minuteman } from "./mascot/Minuteman";

const NAV = [
  { href: "/", label: "Home", icon: House },
  { href: "/todo", label: "To do", icon: ListChecks },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/opportunities", label: "Opportunities", short: "Opps", icon: Briefcase },
  { href: "/housing", label: "Housing", icon: BedDouble },
  { href: "/updates", label: "Updates", icon: Inbox, desktopOnly: true },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/map", label: "Explore Amherst", icon: MapIcon, desktopOnly: true },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { me, items, syncing, refresh, notice, setNotice, signOut, reload, mode, setMode } = useStore();
  // work mode: jobs move up right after Home
  const nav = mode === "work"
    ? [NAV[0], { ...NAV[3], label: "Jobs", short: "Jobs" }, ...NAV.filter((_, i) => i !== 0 && i !== 3)]
    : NAV;
  const path = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [importing, setImporting] = useState(false);
  const search = useRef<HTMLInputElement>(null);

  // "/" focuses search from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName ?? "")) {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // same set as the To do tabs: replies, plus things due from two days ago onward
  const twoDaysAgo = Date.now() - 2 * 86_400_000;
  const todoCount = items?.filter((i) => {
    if (i.category === "reply_owed") return true;
    if (!["deadline", "appointment"].includes(i.category)) return false;
    const w = i.due_at ?? i.starts_at;
    return !!w && new Date(w).getTime() >= twoDaysAgo;
  }).length;

  return (
    <div className="app-sky min-h-screen lg:grid lg:grid-cols-[236px_1fr]">
      {/* sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line-soft bg-white/70 px-4 py-5 backdrop-blur-md lg:flex">
        <Link href="/" className="px-2"><Logo /></Link>
        <nav className="mt-8 flex flex-col gap-0.5" aria-label="Main">
          {nav.map(({ href, label, icon: Icon }) => {
            const on = isActive(path, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={on ? "page" : undefined}
                className={`relative flex items-center gap-3 rounded-full px-4 py-2.5 text-[15px] transition ${
                  on ? "bg-maroon-600 font-semibold text-white shadow-[0_10px_20px_-12px_rgba(132,0,40,0.8)]" : "text-ink-soft hover:bg-maroon-50 hover:text-ink"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={on ? 2.25 : 1.75} />
                {label}
                {href === "/todo" && !!todoCount && (
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${on ? "bg-white/20 text-white" : "bg-maroon-50 text-maroon-700"}`}>{todoCount}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="relative mt-auto rounded-[22px] bg-[linear-gradient(160deg,#fbeef2,#ffffff)] px-1 pb-3 pt-4 ring-1 ring-maroon-100">
          <Minuteman size={58} className="absolute -top-[64px] right-3" />
          <p className="truncate px-3 text-sm font-semibold text-ink">{me.demo ? "Demo student" : displayName(me) || me.email.split("@")[0]}</p>
          <p className="truncate px-3 text-xs text-ink-muted">{me.demo ? "Sample UMass inbox" : me.email}</p>
          <div className="mt-3 flex flex-col gap-0.5 text-sm">
            <Link href="/profile" className={`flex items-center gap-3 rounded-full px-3 py-1.5 hover:bg-white ${path === "/profile" ? "font-semibold text-maroon-700" : "text-ink-soft"}`}>
              <UserRound className="h-4 w-4" /> Profile and privacy
            </Link>
            <button onClick={signOut} className="flex items-center gap-3 rounded-full px-3 py-1.5 text-ink-soft hover:bg-white">
              <LogOut className="h-4 w-4" /> {me.demo ? "Leave the demo" : "Sign out"}
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-0">
        {/* top bar */}
        <header className="sticky top-0 z-20 border-b border-line-soft/70 bg-white/70 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2.5 sm:px-8">
            <Link href="/" className="lg:hidden"><Logo withText={false} size={30} /></Link>
            <form
              className="relative flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
              }}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input
                ref={search}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search deadlines, courses, people"
                aria-label="Search"
                className="w-full max-w-md rounded-full border border-line bg-white/90 py-2 pl-9 pr-4 text-sm outline-none placeholder:text-ink-faint focus:border-maroon-600"
              />
            </form>
            <div role="radiogroup" aria-label="Mode" className="flex shrink-0 rounded-full bg-paper p-1 ring-1 ring-line-soft">
              {([["study", "Study", GraduationCap], ["work", "Work", Briefcase]] as const).map(([m, label, Icon]) => (
                <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)} title={`${label} mode`}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-semibold transition sm:px-3 ${mode === m ? "bg-maroon-600 text-white shadow" : "text-ink-muted hover:text-ink"}`}>
                  <Icon className="h-4 w-4" /><span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setImporting(true)}
              disabled={me.demo}
              title={me.demo ? "Imports are off in the demo" : "Add a syllabus, schedule or screenshot"}
              className="inline-flex items-center gap-1.5 rounded-full bg-maroon-600 px-3 py-2 text-sm font-semibold text-white hover:bg-maroon-700 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} /> <span className="hidden sm:inline">Add</span>
            </button>
            <button
              onClick={refresh}
              disabled={syncing || me.demo}
              title={me.last_sync_at ? `Checked email ${relative(me.last_sync_at)}` : "Check email now"}
              aria-label="Check email now"
              className="grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-ink-soft hover:border-ink-faint disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            </button>
            <Link href="/profile" aria-label="Profile"
              className="grid h-9 w-9 place-items-center rounded-full bg-ink text-sm font-semibold text-white lg:hidden">
              {(displayName(me) || me.email || "?").charAt(0).toUpperCase()}
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-8 sm:pt-8">
          {me.needs_reconnect && (
            <a href="/api/auth/login?consent=1" className="mb-5 block rounded-[20px] border border-maroon-200 bg-maroon-50 px-4 py-3 text-sm text-maroon-800">
              Google paused your Gmail connection (it does this every few days while the app is in testing).{" "}
              <span className="font-semibold underline">Reconnect Gmail</span>
            </a>
          )}
          {notice && (
            <div role="status" className="mb-5 flex items-start justify-between gap-3 rounded-[20px] border border-line-soft bg-white px-4 py-3 text-sm text-ink-soft">
              <span>{notice}</span>
              <button onClick={() => setNotice(null)} className="font-semibold text-ink-muted hover:text-ink">Dismiss</button>
            </div>
          )}
          <main>{children}</main>
        </div>
      </div>

      {/* bottom tabs (phones) */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-line-soft bg-white/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)] lg:hidden">
        {nav.filter((n) => !n.desktopOnly).map(({ href, label, short, icon: Icon }) => {
          const on = isActive(path, href);
          return (
            <Link key={href} href={href} aria-current={on ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10.5px] ${on ? "font-semibold text-maroon-600" : "text-ink-muted"}`}>
              <Icon className="h-5 w-5" strokeWidth={on ? 2.25 : 1.75} />
              {short ?? label}
            </Link>
          );
        })}
      </nav>

      <AskSam />
      {importing && <ImportDialog onClose={() => setImporting(false)} onImported={(m) => { setNotice(m); reload(); }} />}
    </div>
  );
}
