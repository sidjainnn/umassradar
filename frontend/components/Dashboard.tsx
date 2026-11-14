"use client";

import {
  Archive,
  ArrowRight,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  Clock3,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sprout,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  api,
  type Category,
  type Item,
  type Me,
  type OfficeHourSlot,
} from "@/lib/api";
import {
  CATEGORY_LABEL,
  groupItems,
  matchesSearch,
  type SectionId,
} from "@/lib/sections";
import { daysBetween, greeting, longDate } from "@/lib/time";
import { Brief, type BriefData } from "./Brief";
import { Header } from "./Header";
import { ImportDialog } from "./ImportDialog";
import { ItemCard } from "./ItemCard";
import { Logo } from "./Logo";
import { OfficeHours } from "./OfficeHours";
import { SettingsDialog } from "./SettingsDialog";

type View = "open" | "done" | "dismissed";
type Period = "today" | "week" | "all";
type Focus = "overview" | "deadline" | "reply_owed" | "opportunity" | "updates";
const navigation = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "deadline", label: "Deadlines", icon: Clock3 },
  { id: "reply_owed", label: "Replies owed", icon: MessageCircle },
  { id: "opportunity", label: "Opportunities", icon: Sprout },
  { id: "updates", label: "Course updates", icon: GraduationCap },
] as const;
const sectionNames: Record<SectionId, string> = {
  next: "Coming up next · within 3 hours",
  today: "Today & overdue",
  week: "Later this week",
  waiting: "Waiting for your attention",
  later: "Further ahead",
  opportunities: "Opportunities",
  courses: "Course updates",
};
const agendaSections: SectionId[] = [
  "next",
  "today",
  "week",
  "waiting",
  "later",
];
const focusMatches = (item: Item, focus: Focus) =>
  focus === "overview" ||
  (focus === "updates"
    ? ["status_update", "course_info"].includes(item.category)
    : item.category === focus);
const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";

export function Dashboard({
  me,
  onSignedOut,
  onMeChanged,
}: {
  me: Me;
  onSignedOut: () => void;
  onMeChanged: () => void;
}) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [noise, setNoise] = useState<Item[]>([]);
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [view, setView] = useState<View>("open");
  const [focus, setFocus] = useState<Focus>("overview");
  const [period, setPeriod] = useState<Period>("today");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [course, setCourse] = useState("");
  const [source, setSource] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    id: string;
    previous: Item["status"];
    text: string;
  } | null>(null);
  const [settings, setSettings] = useState(false);
  const [importing, setImporting] = useState(false);
  const [officeHours, setOfficeHours] = useState<OfficeHourSlot[]>([]);
  const [showNoise, setShowNoise] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => new Date());
  const initial = useRef(false);
  const loadVersion = useRef(0);
  const briefVersion = useRef(0);
  const pendingIds = useRef(new Set<string>());
  const syncInFlight = useRef(false);

  const loadBrief = useCallback(async () => {
    const version = ++briefVersion.current;
    setBriefLoading(true);
    try {
      const result = await api<BriefData>("/brief");
      if (version === briefVersion.current) setBrief(result);
    } catch {
      if (version === briefVersion.current) setBrief(null);
    } finally {
      if (version === briefVersion.current) setBriefLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoadError(false);
    try {
      const [list, noiseList] = await Promise.all([
        api<Item[]>("/items?status=all"),
        api<Item[]>("/items?status=open&category=noise"),
      ]);
      if (version !== loadVersion.current) return;
      setItems(list);
      setNoise(noiseList);
      api<OfficeHourSlot[]>("/office-hours")
        .then((slots) => setOfficeHours(Array.isArray(slots) ? slots : []))
        .catch(() => setOfficeHours([]));
      void loadBrief();
    } catch (error) {
      if (version === loadVersion.current) {
        setLoadError(true);
        setBriefLoading(false);
        setNotice(message(error));
      }
    }
  }, [loadBrief]);

  const refresh = useCallback(async () => {
    if (syncInFlight.current) return;
    syncInFlight.current = true;
    setSyncing(true);
    setNotice(null);
    try {
      const result = await api<{ status: string; message?: string }>("/sync", {
        method: "POST",
      });
      if (result.message) setNotice(result.message);
      onMeChanged();
      await load();
    } catch (error) {
      setNotice(message(error));
    } finally {
      syncInFlight.current = false;
      setSyncing(false);
    }
  }, [load, onMeChanged]);

  useEffect(() => {
    if (!initial.current) {
      initial.current = true;
      void load();
      const stale =
        !me.last_sync_at ||
        Date.now() - new Date(me.last_sync_at).getTime() > 15 * 60 * 1000;
      if (stale && !me.demo && !me.needs_reconnect) void refresh();
    }
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, [load, refresh, me.last_sync_at, me.demo, me.needs_reconnect]);

  useEffect(() => {
    if (!highlight) return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(`item-${highlight}`);
      target?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "center",
      });
      target?.focus({ preventScroll: true });
    });
    const timer = setTimeout(() => setHighlight(null), 3000);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [highlight]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function setStatus(id: string, status: Item["status"], undo = false) {
    if (pendingIds.current.has(id)) return;
    const previous = items?.find((item) => item.id === id)?.status ?? "open";
    pendingIds.current.add(id);
    setPending(new Set(pendingIds.current));
    try {
      await api(`/items/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      ++loadVersion.current;
      setItems(
        (old) =>
          old?.map((item) => (item.id === id ? { ...item, status } : item)) ??
          null,
      );
      setToast(
        undo
          ? null
          : {
              id,
              previous,
              text:
                status === "done"
                  ? "One less thing. Marked done."
                  : status === "dismissed"
                    ? "Item dismissed."
                    : "Item moved back to open.",
            },
      );
      void loadBrief();
    } catch (error) {
      setNotice(`Couldn’t update that item. ${message(error)}`);
    } finally {
      pendingIds.current.delete(id);
      setPending(new Set(pendingIds.current));
    }
  }

  function navigate(next: Focus, nextView: View = "open") {
    setFocus(next);
    setView(nextView);
    setQuery("");
    setCategory("");
    setCourse("");
    setSource("");
    setPeriod("all");
  }

  function jumpTo(id: string) {
    navigate("overview");
    const item = items?.find((entry) => entry.id === id);
    if (item) setQuery(item.title);
    setHighlight(id);
  }

  async function signOut() {
    try {
      await api("/auth/logout", { method: "POST" });
      onSignedOut();
    } catch (error) {
      setNotice(`Couldn’t sign out. ${message(error)}`);
    }
  }

  const open = (items ?? []).filter((item) => item.status === "open");
  const countFor = (id: Focus) =>
    open.filter((item) => focusMatches(item, id)).length;
  const dueToday = open.filter(
    (item) =>
      item.category === "deadline" &&
      item.due_at &&
      daysBetween(now, new Date(item.due_at)) <= 0,
  ).length;
  const weekCount = open.filter((item) => {
    const date = item.due_at || item.starts_at;
    return (
      date &&
      daysBetween(now, new Date(date)) >= 0 &&
      daysBetween(now, new Date(date)) <= 7
    );
  }).length;
  const courses = [
    ...new Set(
      (items ?? []).map((item) => item.course).filter(Boolean) as string[],
    ),
  ].sort();
  const sources = [
    ...new Set((items ?? []).map((item) => item.source).filter(Boolean)),
  ].sort();
  const isOverview = focus === "overview" && view === "open";
  const filtered = (items ?? []).filter(
    (item) =>
      item.status === view &&
      focusMatches(item, focus) &&
      matchesSearch(item, query) &&
      (!category || item.category === category) &&
      (!course || item.course === course) &&
      (!source || item.source === source),
  );
  const searching = !!(query || category || course || source);
  const shownItems =
    focus === "deadline" && period === "today" && !searching
      ? filtered.filter(
          (item) => item.due_at && daysBetween(now, new Date(item.due_at)) <= 0,
        )
      : filtered;
  const groups = groupItems(filtered, now);
  const visibleSections = agendaSections.filter(
    (section) =>
      period === "all" ||
      (period === "today"
        ? ["next", "today", "waiting"].includes(section)
        : section !== "later"),
  );
  const agendaCount = visibleSections.reduce(
    (sum, section) => sum + groups[section].length,
    0,
  );
  const title =
    view === "done"
      ? "A little progress, collected."
      : view === "dismissed"
        ? "Off your radar."
        : focus === "overview"
          ? `${greeting(now)}${!me.demo && me.name ? `, ${me.name.split(" ")[0]}` : ""}.`
          : navigation.find((nav) => nav.id === focus)?.label;
  const subtitle =
    view === "done"
      ? "Everything you’ve taken care of. Reopen an item any time."
      : view === "dismissed"
        ? "Out of the way, and here if you need them again."
        : focus === "overview"
          ? "Here’s what’s on your radar. Let’s make room for the rest of your day."
          : focus === "deadline"
            ? "Know what’s due. Take it one thing at a time."
            : focus === "reply_owed"
              ? "A few conversations could use your attention."
              : focus === "opportunity"
                ? "Your next good thing might be right here."
                : "The latest from your courses and campus.";
  const renderItem = (item: Item, compact = false) => (
    <ItemCard
      key={item.id}
      item={item}
      compact={compact}
      highlighted={highlight === item.id}
      pending={pending.has(item.id)}
      onStatus={setStatus}
    />
  );

  return (
    <div className="radar-app">
      <a href="#main-content" className="skip-link">
        Skip to your radar
      </a>
      <aside className="sidebar">
        <Link href="/" aria-label="UMass Radar home" className="sidebar-brand">
          <Logo />
        </Link>
        <div className="workspace-label">
          <span className="campus-mark">U</span>
          <span>
            UMass Amherst<small>Your campus, connected</small>
          </span>
        </div>
        <p className="nav-heading">YOUR SPACE</p>
        <nav className="primary-nav" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                navigate(id);
                if (id === "overview") setPeriod("today");
              }}
              aria-current={
                focus === id && view === "open" ? "page" : undefined
              }
              className={focus === id && view === "open" ? "active" : ""}
            >
              <Icon size={17} />
              <span>{label}</span>
              {items && id !== "overview" && countFor(id) > 0 && (
                <span className="nav-count">{countFor(id)}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="archive-nav">
          <p className="nav-heading">TAKEN CARE OF</p>
          <button
            className={view === "done" ? "active" : ""}
            onClick={() => navigate("overview", "done")}
            aria-current={view === "done" ? "page" : undefined}
          >
            <CheckCheck size={17} />
            Done
          </button>
          <button
            className={view === "dismissed" ? "active" : ""}
            onClick={() => navigate("overview", "dismissed")}
            aria-current={view === "dismissed" ? "page" : undefined}
          >
            <Archive size={17} />
            Dismissed
          </button>
        </div>
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <ShieldCheck size={18} />
            <strong>Your inbox stays yours.</strong>
            <p>Read-only access. You’re always in control.</p>
          </div>
          <button onClick={() => setSettings(true)}>
            <Settings size={17} />
            Settings & privacy
          </button>
          <button onClick={signOut}>
            <LogOut size={17} />
            {me.demo ? "Leave demo" : "Sign out"}
          </button>
          <div className="sidebar-footer">
            <span className="connection-dot" />
            Made for life at UMass
          </div>
        </div>
      </aside>
      <div className="app-body">
        <Header
          me={me}
          query={query}
          onQuery={setQuery}
          syncing={syncing}
          onRefresh={refresh}
          onSettings={() => setSettings(true)}
          onImport={() => setImporting(true)}
        />
        <nav className="mobile-nav" aria-label="Mobile navigation">
          {navigation.map(({ id, label }) => (
            <button
              key={id}
              className={focus === id && view === "open" ? "active" : ""}
              onClick={() => {
                navigate(id);
                if (id === "overview") setPeriod("today");
              }}
            >
              {label}
            </button>
          ))}
          <button
            className={view === "done" ? "active" : ""}
            onClick={() => navigate("overview", "done")}
          >
            Done
          </button>
          <button
            className={view === "dismissed" ? "active" : ""}
            onClick={() => navigate("overview", "dismissed")}
          >
            Dismissed
          </button>
          <button onClick={signOut}>
            {me.demo ? "Leave demo" : "Sign out"}
          </button>
        </nav>
        <main id="main-content" className="dashboard-main">
          {me.demo && (
            <div className="demo-banner">
              <span>
                <span className="demo-pill">DEMO</span>You’re exploring a sample
                inbox. Your real inbox is untouched.
              </span>
              <a href="/api/auth/login">
                Connect your inbox
                <ArrowRight size={13} />
              </a>
            </div>
          )}
          {me.needs_reconnect && (
            <div className="notice reconnect-notice">
              <span>
                Your Gmail connection has expired. Reconnect to keep your radar
                up to date.
              </span>
              <a href="/api/auth/login">Reconnect Gmail →</a>
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              <span>{notice}</span>
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice(null)}
              >
                <X size={16} />
              </button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <p className="date-eyebrow">
                {longDate(now)}
                <span> / </span>YOUR CAMPUS, AT A GLANCE
              </p>
              <h1>{title}</h1>
              <p className="page-subtitle">{subtitle}</p>
            </div>
            <span className="semester-badge">
              <CalendarDays size={14} />
              {now.getMonth() >= 7
                ? "Fall"
                : now.getMonth() >= 5
                  ? "Summer"
                  : "Spring"}{" "}
              {now.getFullYear()}
            </span>
          </div>
          {isOverview && !searching && (
            <>
              <Brief brief={brief} loading={briefLoading} onJump={jumpTo} />
              <div className="summary-grid">
                {[
                  {
                    label: "Due today",
                    value: dueToday,
                    hint: "Including overdue",
                    icon: Clock3,
                    tone: "maroon",
                    action: () => {
                      navigate("deadline");
                      setPeriod("today");
                    },
                  },
                  {
                    label: "This week",
                    value: weekCount,
                    hint: "Due or happening",
                    icon: CalendarDays,
                    tone: "blue",
                    action: () => setPeriod("week"),
                  },
                  {
                    label: "Replies owed",
                    value: countFor("reply_owed"),
                    hint: "Keep things moving",
                    icon: MessageCircle,
                    tone: "amber",
                    action: () => navigate("reply_owed"),
                  },
                  {
                    label: "Opportunities",
                    value: countFor("opportunity"),
                    hint: "Worth a look",
                    icon: Sprout,
                    tone: "green",
                    action: () => navigate("opportunity"),
                  },
                ].map(({ label, value, hint, icon: Icon, tone, action }) => (
                  <button
                    key={label}
                    className={`summary-card summary-${tone}`}
                    onClick={action}
                  >
                    <div>
                      <span className="summary-label">{label}</span>
                      <Icon size={17} />
                    </div>
                    <strong>
                      {items === null ? "—" : value.toString().padStart(2, "0")}
                    </strong>
                    <span className="summary-hint">
                      {hint}
                      <ArrowRight size={13} />
                    </span>
                  </button>
                ))}
              </div>
              <OfficeHours
                slots={officeHours}
                calendarConnected={!!me.calendar_connected}
              />
            </>
          )}
          <div className="content-toolbar">
            <div>
              <h2>
                {searching
                  ? "Search results"
                  : isOverview
                    ? "Your agenda"
                    : view === "open"
                      ? "On your radar"
                      : view === "done"
                        ? "Completed items"
                        : "Dismissed items"}
              </h2>
              <span>
                {searching
                  ? `${filtered.length} matching items`
                  : isOverview
                    ? "The important things, in a little more order."
                    : `${shownItems.length} item${shownItems.length === 1 ? "" : "s"}`}
              </span>
            </div>
            <button
              className={`filter-button ${searching || showFilters ? "selected" : ""}`}
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              aria-controls="radar-filters"
            >
              <SlidersHorizontal size={14} />
              Filters{(category || course || source) && (
                <span className="filter-dot" />
              )}
            </button>
          </div>
          {showFilters && (
            <div className="filter-panel" id="radar-filters">
              <label>
                Category
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option value="">All categories</option>
                  {(Object.keys(CATEGORY_LABEL) as Category[])
                    .filter((c) => c !== "noise")
                    .map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABEL[c]}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Course
                <select
                  value={course}
                  onChange={(event) => setCourse(event.target.value)}
                >
                  <option value="">All courses</option>
                  {courses.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Source
                <select
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                >
                  <option value="">All sources</option>
                  {sources.map((value) => (
                    <option key={value} value={value}>
                      {value === "gmail"
                        ? "Gmail"
                        : value === "canvas"
                          ? "Canvas"
                          : value === "demo"
                            ? "Demo inbox"
                            : value}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="text-button"
                onClick={() => {
                  setCategory("");
                  setCourse("");
                  setSource("");
                  setQuery("");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
          {loadError && (
            <div className="empty-state">
              <Inbox size={28} />
              <h3>Your inbox couldn’t load.</h3>
              <p>Check your connection, then give it another try.</p>
              <button className="secondary-button" onClick={load}>
                Try again
              </button>
            </div>
          )}
          {items === null && !loadError ? (
            <div className="agenda-skeleton" role="status">
              <span className="sr-only">Loading your items</span>
              {[1, 2, 3].map((n) => (
                <div key={n} />
              ))}
            </div>
          ) : (
            items !== null &&
            (!isOverview || searching ? (
              <div className="flat-items">
                {shownItems.map((item) => renderItem(item))}
                {shownItems.length === 0 && (
                  <Empty
                    title={
                      searching
                        ? "Nothing matching just yet."
                        : view === "done"
                          ? "Small wins start here."
                          : view === "dismissed"
                            ? "Nothing dismissed."
                            : "You’re all clear here."
                    }
                    text={
                      searching
                        ? "Try another search or clear your filters."
                        : view === "done"
                          ? "Mark an item done and you’ll find it here."
                          : "New items will appear after your next inbox sync."
                    }
                  />
                )}
                {focus === "deadline" && period === "today" && !searching && (
                  <button
                    className="text-button list-footer"
                    onClick={() => setPeriod("all")}
                  >
                    View all deadlines <ArrowRight size={14} />
                  </button>
                )}
              </div>
            ) : (
              <div className="overview-columns">
                <section className="agenda-panel" aria-label="Your agenda">
                  <div
                    className="agenda-tabs"
                    role="group"
                    aria-label="Agenda timeframe"
                  >
                    {(["today", "week", "all"] as Period[]).map((p) => (
                      <button
                        key={p}
                        aria-pressed={period === p}
                        className={period === p ? "active" : ""}
                        onClick={() => setPeriod(p)}
                      >
                        {p === "today"
                          ? "Today"
                          : p === "week"
                            ? "This week"
                            : "All upcoming"}
                      </button>
                    ))}
                    <span>{agendaCount} items</span>
                  </div>
                  {visibleSections.map(
                    (section) =>
                      groups[section].length > 0 && (
                        <div className="agenda-group" key={section}>
                          <h3
                            className={section === "next" ? "next-label" : ""}
                          >
                            {section === "next" && (
                              <span className="connection-dot" />
                            )}
                            {sectionNames[section]}
                            <span>{groups[section].length}</span>
                          </h3>
                          {groups[section].map((item) => renderItem(item))}
                        </div>
                      ),
                  )}
                  {agendaCount === 0 && (
                    <Empty
                      title={
                        period === "today"
                          ? "A little breathing room."
                          : "Nothing on the agenda."
                      }
                      text={
                        period === "today"
                          ? "No deadlines or appointments need your attention today."
                          : "New deadlines and appointments will appear here."
                      }
                    />
                  )}
                  {period !== "all" && (
                    <button
                      className="agenda-footer"
                      onClick={() =>
                        setPeriod(period === "today" ? "week" : "all")
                      }
                    >
                      {period === "today"
                        ? "Take a look at the rest of your week"
                        : "See everything coming up"}
                      <ArrowRight size={14} />
                    </button>
                  )}
                </section>
                <aside className="insights-column">
                  <section className="insight-panel">
                    <div className="panel-heading">
                      <span className="panel-icon green">
                        <Sprout size={16} />
                      </span>
                      <h2>Worth a look</h2>
                      <span className="panel-count">
                        {groups.opportunities.length}
                      </span>
                    </div>
                    <p className="panel-description">
                      A next step, a new door, a good possibility.
                    </p>
                    {groups.opportunities
                      .slice(0, 3)
                      .map((item) => renderItem(item, true))}
                    {groups.opportunities.length === 0 && (
                      <p className="quiet-empty">
                        New opportunities will land here.
                      </p>
                    )}
                    {groups.opportunities.length > 0 && (
                      <button
                        className="panel-footer"
                        onClick={() => navigate("opportunity")}
                      >
                        All opportunities
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </section>
                  <section className="insight-panel">
                    <div className="panel-heading">
                      <span className="panel-icon blue">
                        <GraduationCap size={16} />
                      </span>
                      <h2>Good to know</h2>
                      <span className="panel-count">
                        {groups.courses.length}
                      </span>
                    </div>
                    <p className="panel-description">
                      Updates without the inbox digging.
                    </p>
                    {groups.courses
                      .slice(0, 2)
                      .map((item) => renderItem(item, true))}
                    {groups.courses.length === 0 && (
                      <p className="quiet-empty">
                        You’re up to date on course news.
                      </p>
                    )}
                    {groups.courses.length > 0 && (
                      <button
                        className="panel-footer"
                        onClick={() => navigate("updates")}
                      >
                        All course updates
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </section>
                </aside>
              </div>
            ))
          )}
          {isOverview && !searching && items !== null && (
            <section className="noise-panel">
              <button
                className="noise-toggle"
                onClick={() => setShowNoise(!showNoise)}
                aria-expanded={showNoise}
                aria-controls="noise-list"
              >
                <ShieldCheck size={16} />
                <span>
                  <strong>{noise.length} fewer distractions.</strong> Promotions
                  and newsletters, quietly filtered.
                </span>
                <ChevronDown
                  size={16}
                  className={showNoise ? "rotate-180" : ""}
                />
              </button>
              {showNoise && (
                <ul id="noise-list">
                  {noise.length === 0 ? (
                    <li>No filtered messages yet.</li>
                  ) : (
                    noise.map((item) => (
                      <li key={item.id}>
                        <span>{item.title}</span>
                        <small>{item.sender}</small>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </section>
          )}
          <footer className="dashboard-footer">
            <span>Less noise. More college.</span>
            <span>All times in Eastern Time</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCheck size={17} />
          <span>{toast.text}</span>
          <button
            disabled={pending.has(toast.id)}
            onClick={() => setStatus(toast.id, toast.previous, true)}
          >
            Undo
          </button>
          <button
            aria-label="Dismiss confirmation"
            onClick={() => setToast(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {settings && (
        <SettingsDialog
          me={me}
          onClose={() => setSettings(false)}
          onChanged={(text) => {
            if (text) setNotice(text);
            onMeChanged();
            void load();
          }}
          onDeleted={onSignedOut}
        />
      )}
      {importing && (
        <ImportDialog
          onClose={() => setImporting(false)}
          onImported={(text) => {
            setNotice(text);
            void load();
          }}
        />
      )}
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <CheckCheck size={25} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
