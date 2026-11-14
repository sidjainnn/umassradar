"use client";

import { BookOpen, Plus, RefreshCw, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
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
};

export function Header({
  me,
  query,
  onQuery,
  syncing,
  onRefresh,
  onSettings,
  onImport,
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !target.isContentEditable &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      ) {
        event.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <header className="topbar">
      <div className="mobile-brand">
        <Logo size={32} withText={false} />
      </div>
      <div className="search-field">
        <Search size={17} aria-hidden="true" />
        <input
          ref={input}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search your radar…"
          aria-label="Search your radar"
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              onQuery("");
              input.current?.focus();
            }}
          >
            <X size={15} />
          </button>
        ) : (
          <kbd>/</kbd>
        )}
      </div>
      <div className="topbar-actions">
        <span className="sync-label" aria-live="polite">
          <span className={`connection-dot ${syncing ? "syncing" : ""}`} />
          {me.demo
            ? "Demo inbox"
            : syncing
              ? "Syncing inbox"
              : me.needs_reconnect
                ? "Reconnect needed"
                : me.last_sync_at
                  ? `Synced ${relative(me.last_sync_at)}`
                  : "Ready to sync"}
        </span>
        <Link
          href="/courses"
          className="topbar-link"
          aria-label="Browse courses"
        >
          <BookOpen size={16} />
          <span>Courses</span>
        </Link>
        <button
          className="topbar-link"
          onClick={onImport}
          disabled={me.demo}
          aria-label="Import a syllabus or screenshot"
          title={me.demo ? "Imports are unavailable in the demo" : "Import"}
        >
          <Plus size={16} />
          <span>Import</span>
        </button>
        <button
          className="icon-button"
          onClick={onRefresh}
          disabled={syncing}
          aria-label="Refresh inbox"
          title="Refresh inbox"
        >
          <RefreshCw size={17} className={syncing ? "animate-spin" : ""} />
        </button>
        <button
          className="avatar"
          onClick={onSettings}
          aria-label="Open account settings"
        >
          {(me.name || me.email || "S").charAt(0).toUpperCase()}
        </button>
      </div>
    </header>
  );
}
