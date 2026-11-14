"use client";

import { LogOut, Plus, RefreshCw, Search, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Me } from "@/lib/api";
import { relative } from "@/lib/time";
import { Logo } from "./Logo";

type Props = {
  me: Me;
  query: string;
  onQuery: (q: string) => void;
  syncing: boolean;
  onRefresh: () => void;
  onSettings: () => void;
  onImport: () => void;
  onSignOut: () => void;
};

export function Header({ me, query, onQuery, syncing, onRefresh, onSettings, onImport, onSignOut }: Props) {
  const [menu, setMenu] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-[#f7f6f4]/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Logo />
        <Link href="/courses" className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 sm:block">
          Courses
        </Link>
        <label className="relative ml-auto flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            ref={input}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search deadlines, courses, people…"
            className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-10 text-sm outline-none placeholder:text-stone-400 focus:border-maroon-500 focus:ring-2 focus:ring-maroon-100"
          />
          <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-stone-200 px-1.5 text-[10px] text-stone-400 sm:block">
            /
          </kbd>
        </label>
        <button
          onClick={onImport}
          disabled={me.demo}
          title={me.demo ? "Imports are off in the demo" : "Import a syllabus or screenshot"}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:border-stone-300 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Import</span>
        </button>
        <button
          onClick={onRefresh}
          disabled={syncing}
          title={me.last_sync_at ? `Last synced ${relative(me.last_sync_at)}` : "Not synced yet"}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:border-stone-300 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">{syncing ? "Syncing" : "Refresh"}</span>
        </button>
        <div className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            className="grid h-9 w-9 place-items-center rounded-full bg-maroon-600 text-sm font-semibold text-white"
            aria-label="Account menu"
          >
            {(me.name || me.email || "?").charAt(0).toUpperCase()}
          </button>
          {menu && (
            <div
              className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl border border-stone-200 bg-white text-sm shadow-xl"
              onMouseLeave={() => setMenu(false)}
            >
              <div className="border-b border-stone-100 px-4 py-3">
                <p className="font-medium text-stone-900">{me.demo ? "Demo student" : me.name}</p>
                <p className="truncate text-xs text-stone-500">{me.demo ? "Sample UMass inbox" : me.email}</p>
              </div>
              <button onClick={() => { setMenu(false); onSettings(); }} className="flex w-full items-center gap-2 px-4 py-2.5 hover:bg-stone-50">
                <Settings className="h-4 w-4 text-stone-400" /> Settings & privacy
              </button>
              <button onClick={onSignOut} className="flex w-full items-center gap-2 px-4 py-2.5 hover:bg-stone-50">
                <LogOut className="h-4 w-4 text-stone-400" /> {me.demo ? "Leave demo" : "Sign out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
