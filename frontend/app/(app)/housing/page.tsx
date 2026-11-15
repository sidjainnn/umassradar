"use client";

import { AlertTriangle, ExternalLink, Flag, MapPin, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ItemList } from "@/components/ItemRow";
import { PageHeader, Tabs } from "@/components/Page";
import { api, type Item } from "@/lib/api";
import { useStore } from "@/lib/store";

type Kind = "sublet_offer" | "sublet_wanted" | "swap" | "roommate";
type Post = {
  id: string; kind: Kind; title: string; area: string; building: string | null; rent: number | null;
  start: string | null; end: string | null; bedrooms: number | null; furnished: boolean | null; description: string;
  sleep: string | null; tidiness: string | null; guests: string | null; smoking: string | null; wants: string | null;
  poster: string; mine: boolean; warnings: string[]; sample: boolean; status: string;
};
type Match = Post & { score: number; reasons: string[] };
type Req = { id: string; post_title: string; status: string; message: string; name: string; email: string | null };
type Tab = "guide" | "sublets" | "swaps" | "roommates" | "mine";

const AREAS = ["On campus", "Amherst", "Hadley", "Sunderland", "Northampton", "Belchertown", "South Hadley", "Other"];
const KIND_LABEL: Record<Kind, string> = {
  sublet_offer: "Sublet offered", sublet_wanted: "Looking for a sublet", swap: "Room swap", roommate: "Roommate",
};

function dateRange(p: { start: string | null; end: string | null }): string | null {
  if (!p.start) return null;
  const f = (s: string) => new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return p.end ? `${f(p.start)} to ${f(p.end)}` : `From ${f(p.start)}`;
}

// ---------- guide ----------

function Guide() {
  const { setStatus } = useStore();
  const [dates, setDates] = useState<Item[] | null>(null);
  useEffect(() => { api<Item[]>("/housing/timeline").then(setDates).catch(() => setDates([])); }, []);

  const link = (href: string, label: string) => (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-maroon-600 hover:underline">
      {label} <ExternalLink className="h-3 w-3" />
    </a>
  );
  const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="rounded-[22px] border border-line-soft bg-surface shadow-[0_18px_40px_-30px_rgba(60,0,20,0.4)] px-5 py-5 sm:px-6">
      <h2 className="font-display text-lg font-extrabold tracking-[-0.03em] text-ink">{title}</h2>
      <div className="mt-2 space-y-2 text-[15px] leading-relaxed text-ink-soft">{children}</div>
    </section>
  );

  return (
    <div className="space-y-5">
      <ItemList title="Your housing dates" items={dates ?? []} onStatus={setStatus}
        empty="Housing emails (room selection, move-out, lease and Res Life deadlines) show up here as they arrive." />

      <Block title="Living on campus">
        <p>Room selection, room changes and swaps all go through Residential Life. Use the Room swaps tab here to find
          someone to trade with, then make the change official through Housing.</p>
        <p>{link("https://www.umass.edu/living/", "Residential Life and Housing")}</p>
      </Block>

      <Block title="Moving off campus, step by step">
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Start looking in the fall for the next academic year. Most Amherst leases start June 1 or September 1.</li>
          <li>Set a budget. Rent per bedroom in Amherst is usually $750 to $1,200 a month, plus utilities and internet.</li>
          <li>Search the official listings and the Sublets and Roommates tabs. Check bus routes: PVTA lines 30, 31 and 38 run to campus.</li>
          <li>Visit in person, or have a friend go, before you sign or pay anything.</li>
          <li>Get the lease reviewed for free by Student Legal Services before you sign.</li>
          <li>Take dated photos at move-in and keep every receipt for your security deposit.</li>
        </ol>
        <p className="flex flex-wrap gap-x-5 gap-y-1">
          {link("https://offcampushousing.umass.edu/", "Official off-campus listings")}
          {link("https://www.umass.edu/dean-students/off-campus-life", "Off-Campus Student Life")}
          {link("https://www.umass.edu/student-life/student-legal-services", "Student Legal Services (free lease review)")}
        </p>
      </Block>

      <Block title="Before you sign or pay">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Never wire money, pay with gift cards or crypto, or pay a deposit before seeing the place.</li>
          <li>Be wary of a landlord who is out of the country and will mail you keys. That is a common scam.</li>
          <li>For a sublet, make sure the original lease allows subletting and the landlord agrees in writing.</li>
          <li>In Massachusetts, a landlord can only ask for first and last month&apos;s rent, a security deposit no bigger than one month&apos;s rent, and a lock fee.</li>
          <li>Posts here that mention scam warning signs are marked. Report anything that feels off.</li>
        </ul>
      </Block>
    </div>
  );
}

// ---------- board ----------

function PostCard({ post, onChanged, extra }: { post: Post; onChanged: () => void; extra?: React.ReactNode }) {
  const { me, setNotice } = useStore();
  const [writing, setWriting] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const range = dateRange(post);
  const prefs = [post.sleep && `${post.sleep} sleeper`, post.tidiness, post.guests && `guests ${post.guests}`,
    post.smoking && `smoking: ${post.smoking}`].filter(Boolean);

  async function connect() {
    setBusy(true);
    try {
      const r = await api<{ sample?: boolean; already?: boolean }>(`/housing/posts/${post.id}/connect`, { method: "POST", body: JSON.stringify({ message }) });
      setNotice(r.sample ? "This is an example post, so nothing was sent." : r.already ? "You already asked to connect on this post."
        : "Request sent. If they accept, you'll both see each other's UMass email under Your posts.");
      setWriting(false);
    } catch (e) { setNotice(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }

  async function report() {
    const reason = prompt("What's wrong with this post? (for example: looks like a scam, already taken, offensive)");
    if (!reason || reason.trim().length < 3) return;
    await api(`/housing/posts/${post.id}/report`, { method: "POST", body: JSON.stringify({ reason }) });
    setNotice("Thanks. Posts reported by several students are hidden until reviewed.");
    onChanged();
  }

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[15px] font-semibold text-ink">{post.title}</p>
        {post.rent != null && (
          <span className="shrink-0 font-display text-lg font-extrabold tracking-[-0.03em] text-ink">
            ${post.rent}<span className="text-sm font-normal text-ink-muted">{post.kind === "sublet_offer" ? "/mo" : "/mo budget"}</span>
          </span>
        )}
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-muted">
        <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{[post.building, post.area].filter(Boolean).join(", ")}</span>
        {range && <span>{range}</span>}
        {post.bedrooms != null && <span>{post.bedrooms} bedroom{post.bedrooms === 1 ? "" : "s"}</span>}
        {post.furnished && <span>Furnished</span>}
        {post.wants && <span>Wants: {post.wants}</span>}
        <span className="text-ink-faint">{post.mine ? "Your post" : post.poster}</span>
      </p>
      {prefs.length > 0 && <p className="mt-1 text-[13px] text-ink-soft">{prefs.join(", ")}</p>}
      {post.description && <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-ink-soft">{post.description}</p>}
      {post.warnings.length > 0 && (
        <p role="alert" className="mt-2 inline-flex items-start gap-1.5 rounded-lg bg-maroon-50 px-3 py-2 text-[13px] text-maroon-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          This post mentions a common scam sign ({post.warnings[0]}). Don&apos;t send money before seeing the place.
        </p>
      )}
      {extra}
      {!post.mine && (
        <div className="mt-3">
          {writing ? (
            <div className="space-y-2">
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={600} rows={3}
                placeholder="Say hi and why it's a fit. Your email is only shared if they accept."
                className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-maroon-600" />
              <div className="flex gap-3 text-sm font-semibold">
                <button disabled={busy} onClick={connect} className="rounded-full bg-maroon-600 px-3 py-1.5 text-white hover:bg-maroon-700 disabled:opacity-50">
                  {busy ? "Sending…" : "Send request"}
                </button>
                <button onClick={() => setWriting(false)} className="text-ink-muted hover:text-ink">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-5 text-sm font-semibold">
              <button onClick={() => setWriting(true)} disabled={me.demo && !post.sample}
                className="text-maroon-600 hover:underline disabled:opacity-40">Ask to connect</button>
              {!post.sample && (
                <button onClick={report} className="inline-flex items-center gap-1 text-ink-muted hover:text-ink"><Flag className="h-3.5 w-3.5" /> Report</button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function PostList({ kinds, empty, onPost }: { kinds: Kind[]; empty: string; onPost: (k: Kind) => void }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [area, setArea] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [kind, setKind] = useState<Kind | "">("");

  const load = useCallback(() => {
    const q = new URLSearchParams({ kind: (kind ? [kind] : kinds).join(",") });
    if (area) q.set("area", area);
    if (maxRent) q.set("max_rent", maxRent);
    api<Post[]>(`/housing/posts?${q}`).then(setPosts).catch(() => setPosts([]));
  }, [kinds, kind, area, maxRent]);
  useEffect(() => { load(); }, [load]);

  const select = "rounded-lg border border-line bg-surface px-2.5 py-2 text-sm";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {kinds.length > 1 && (
          <select value={kind} onChange={(e) => setKind(e.target.value as Kind | "")} className={select} aria-label="Type">
            <option value="">All</option>
            {kinds.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </select>
        )}
        <select value={area} onChange={(e) => setArea(e.target.value)} className={select} aria-label="Area">
          <option value="">Any area</option>
          {AREAS.map((a) => <option key={a}>{a}</option>)}
        </select>
        {!kinds.includes("swap") && (
          <select value={maxRent} onChange={(e) => setMaxRent(e.target.value)} className={select} aria-label="Max rent">
            <option value="">Any rent</option>
            {[600, 800, 1000, 1200, 1500].map((r) => <option key={r} value={r}>Up to ${r}</option>)}
          </select>
        )}
        <div className="ml-auto flex gap-2">
          {kinds.map((k) => (
            <button key={k} onClick={() => onPost(k)} className="rounded-full bg-maroon-600 px-3 py-2 text-sm font-semibold text-white hover:bg-maroon-700">
              {k === "sublet_offer" ? "Offer a sublet" : k === "sublet_wanted" ? "Ask for a sublet" : k === "swap" ? "Post a swap" : "Make a roommate profile"}
            </button>
          ))}
        </div>
      </div>
      {posts === null ? <div className="h-40 animate-pulse rounded-xl bg-line-soft" /> : posts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-5 py-6 text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line-soft rounded-[22px] border border-line-soft bg-surface shadow-[0_18px_40px_-30px_rgba(60,0,20,0.4)]">
          {posts.map((p) => <PostCard key={p.id} post={p} onChanged={load} />)}
        </ul>
      )}
    </div>
  );
}

function Roommates({ onPost }: { onPost: (k: Kind) => void }) {
  const [matches, setMatches] = useState<{ post: Post; matches: Match[] }[] | null>(null);
  useEffect(() => { api<{ post: Post; matches: Match[] }[]>("/housing/matches").then(setMatches).catch(() => setMatches([])); }, []);
  const roommate = (matches ?? []).filter((m) => m.post.kind === "roommate");

  return (
    <div className="space-y-8">
      {roommate.length > 0 && roommate.map(({ post, matches: list }) => (
        <section key={post.id}>
          <h2 className="mb-2 text-[15px] font-semibold text-ink-soft">Best matches for “{post.title}”</h2>
          {list.length === 0 ? <p className="text-sm text-ink-muted">No good matches yet. New profiles are checked as they come in.</p> : (
            <ul className="divide-y divide-line-soft rounded-[22px] border border-line-soft bg-surface shadow-[0_18px_40px_-30px_rgba(60,0,20,0.4)]">
              {list.map((m) => (
                <PostCard key={m.id} post={m} onChanged={() => {}} extra={
                  <p className="mt-2 text-[13px]">
                    <span className="font-semibold text-forest">{m.score}% match.</span>{" "}
                    <span className="text-ink-muted">{m.reasons.join(". ")}.</span>
                  </p>
                } />
              ))}
            </ul>
          )}
        </section>
      ))}
      {roommate.length === 0 && (
        <p className="rounded-[22px] border border-line-soft bg-surface shadow-[0_18px_40px_-30px_rgba(60,0,20,0.4)] px-5 py-4 text-[15px] text-ink-soft">
          Make a roommate profile and UMass Radar ranks other students by budget, dates, area, sleep schedule, tidiness,
          guests and smoking, and tells you why each one fits.
        </p>
      )}
      <PostList kinds={["roommate"]} empty="No roommate profiles yet." onPost={onPost} />
    </div>
  );
}

function Mine() {
  const { setNotice } = useStore();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [reqs, setReqs] = useState<{ incoming: Req[]; outgoing: Req[] } | null>(null);
  const load = useCallback(() => {
    api<Post[]>("/housing/mine").then(setPosts).catch(() => setPosts([]));
    api<{ incoming: Req[]; outgoing: Req[] }>("/housing/requests").then(setReqs).catch(() => setReqs({ incoming: [], outgoing: [] }));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function decide(id: string, accept: boolean) {
    await api(`/housing/requests/${id}`, { method: "POST", body: JSON.stringify({ accept }) });
    setNotice(accept ? "Accepted. You can now see each other's UMass email." : "Declined.");
    load();
  }
  async function close(id: string) { await api(`/housing/posts/${id}`, { method: "PATCH" }); load(); }
  async function remove(id: string) { if (confirm("Delete this post and its requests?")) { await api(`/housing/posts/${id}`, { method: "DELETE" }); load(); } }

  const Row = ({ r, incoming }: { r: Req; incoming: boolean }) => (
    <li className="px-5 py-3.5 text-[15px]">
      <p><span className="font-semibold text-ink">{r.name}</span> <span className="text-ink-muted">{incoming ? "asked about" : "you asked about"}</span> {r.post_title}</p>
      {r.message && <p className="mt-1 text-sm italic text-ink-soft">“{r.message}”</p>}
      <p className="mt-1.5 text-sm">
        {r.status === "accepted" ? <span className="font-semibold text-forest">Connected: <a href={`mailto:${r.email}`} className="underline">{r.email}</a></span>
          : r.status === "declined" ? <span className="text-ink-muted">Declined</span>
          : incoming ? (
            <span className="flex gap-4 font-semibold">
              <button onClick={() => decide(r.id, true)} className="text-maroon-600 hover:underline">Accept and share emails</button>
              <button onClick={() => decide(r.id, false)} className="text-ink-muted hover:text-ink">Decline</button>
            </span>
          ) : <span className="text-ink-muted">Waiting for a reply</span>}
      </p>
    </li>
  );

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-2 text-[15px] font-semibold text-ink-soft">Requests to connect</h2>
        {!reqs || reqs.incoming.length + reqs.outgoing.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-5 py-5 text-sm text-ink-muted">No requests yet.</p>
        ) : (
          <ul className="divide-y divide-line-soft rounded-[22px] border border-line-soft bg-surface shadow-[0_18px_40px_-30px_rgba(60,0,20,0.4)]">
            {reqs.incoming.map((r) => <Row key={r.id} r={r} incoming />)}
            {reqs.outgoing.map((r) => <Row key={r.id} r={r} incoming={false} />)}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-2 text-[15px] font-semibold text-ink-soft">Your posts</h2>
        {!posts || posts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line px-5 py-5 text-sm text-ink-muted">You haven&apos;t posted anything. Posts stay up for 90 days.</p>
        ) : (
          <ul className="divide-y divide-line-soft rounded-[22px] border border-line-soft bg-surface shadow-[0_18px_40px_-30px_rgba(60,0,20,0.4)]">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} onChanged={load} extra={
                <p className="mt-2 flex gap-4 text-sm font-semibold">
                  <span className="text-ink-muted">{KIND_LABEL[p.kind]}{p.status !== "open" ? ", closed" : ""}</span>
                  {p.status === "open" && <button onClick={() => close(p.id)} className="text-maroon-600 hover:underline">Mark as taken</button>}
                  <button onClick={() => remove(p.id)} className="text-ink-muted hover:text-ink">Delete</button>
                </p>
              } />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------- post form ----------

function PostForm({ kind, onClose, onPosted }: { kind: Kind; onClose: () => void; onPosted: () => void }) {
  const [f, setF] = useState<Record<string, string>>({ area: kind === "swap" ? "On campus" : "Amherst" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const input = "mt-1 w-full rounded-lg border border-line px-3 py-2 text-[15px] font-normal outline-none focus:border-maroon-600";
  const label = "block text-sm font-semibold text-ink";

  async function submit() {
    setBusy(true); setError(null);
    const body: Record<string, unknown> = { kind, title: f.title ?? "", area: f.area, description: f.description ?? "" };
    for (const k of ["building", "wants", "sleep", "tidiness", "guests", "smoking"]) if (f[k]) body[k] = f[k];
    for (const k of ["rent", "bedrooms"]) if (f[k]) body[k] = Number(f[k]);
    for (const k of ["start", "end"]) if (f[k]) body[k] = f[k];
    if (f.furnished) body.furnished = f.furnished === "yes";
    try { await api("/housing/posts", { method: "POST", body: JSON.stringify(body) }); onPosted(); onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }

  const choice = (k: string, l: string, opts: string[]) => (
    <label className={label}>{l}
      <select value={f[k] ?? ""} onChange={set(k)} className={input}><option value="">Skip</option>{opts.map((o) => <option key={o}>{o}</option>)}</select>
    </label>
  );

  return (
    <div className="fixed inset-0 z-40 grid place-items-end bg-ink/40 sm:place-items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-6 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold tracking-[-0.03em]">{KIND_LABEL[kind]}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-ink-faint hover:bg-paper"><X className="h-5 w-5" /></button>
        </div>
        {error && <p role="alert" className="mt-3 rounded-lg bg-maroon-50 px-3 py-2 text-sm text-maroon-800">{error}</p>}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className={`${label} sm:col-span-2`}>Title
            <input value={f.title ?? ""} onChange={set("title")} maxLength={90} className={input}
              placeholder={kind === "swap" ? "Double in Southwest for a single in Northeast" : kind === "roommate" ? "CS junior looking for a fall roommate" : "Spring sublet, room in a 3BR on Hazel Ave"} />
          </label>
          <label className={label}>Area<select value={f.area} onChange={set("area")} className={input}>{AREAS.map((a) => <option key={a}>{a}</option>)}</select></label>
          <label className={label}>{kind === "swap" ? "Your hall and area" : "Street or building"}
            <input value={f.building ?? ""} onChange={set("building")} maxLength={80} className={input} placeholder={kind === "swap" ? "Kennedy Hall, Southwest" : "No house number needed"} />
          </label>
          {kind === "swap" ? (
            <label className={`${label} sm:col-span-2`}>What you want instead<input value={f.wants ?? ""} onChange={set("wants")} maxLength={120} className={input} placeholder="Anything in Northeast" /></label>
          ) : (
            <>
              <label className={label}>{kind === "sublet_offer" ? "Rent per month ($)" : "Max budget per month ($)"}<input type="number" min={0} value={f.rent ?? ""} onChange={set("rent")} className={input} /></label>
              {kind === "sublet_offer" ? (
                <label className={label}>Bedrooms in the place<input type="number" min={0} max={10} value={f.bedrooms ?? ""} onChange={set("bedrooms")} className={input} /></label>
              ) : <span />}
              <label className={label}>From<input type="date" value={f.start ?? ""} onChange={set("start")} className={input} /></label>
              <label className={label}>Until<input type="date" value={f.end ?? ""} onChange={set("end")} className={input} /></label>
            </>
          )}
          {kind === "sublet_offer" && choice("furnished", "Furnished", ["yes", "no"])}
          {kind === "roommate" && (
            <>
              {choice("sleep", "Sleep schedule", ["early", "late", "flexible"])}
              {choice("tidiness", "Tidiness", ["very tidy", "average", "relaxed"])}
              {choice("guests", "Guests over", ["rarely", "sometimes", "often"])}
              {choice("smoking", "Smoking", ["no", "outside only", "yes"])}
            </>
          )}
          <label className={`${label} sm:col-span-2`}>Details
            <textarea value={f.description ?? ""} onChange={set("description")} maxLength={1200} rows={4} className={input}
              placeholder="Bus line, utilities, housemates, anything that helps. Don't include your phone or address." />
          </label>
        </div>
        <p className="mt-3 text-[13px] text-ink-muted">
          Your name and email stay hidden. People ask to connect, and only if you accept do you see each other&apos;s UMass email.
          Posts come down after 90 days. Don&apos;t describe who you will or won&apos;t live with by race, religion, disability or other protected traits.
        </p>
        <button onClick={submit} disabled={busy} className="mt-4 rounded-full bg-maroon-600 px-4 py-2 text-sm font-semibold text-white hover:bg-maroon-700 disabled:opacity-50">
          {busy ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}

// ---------- page ----------

export default function HousingPage() {
  const { me, setNotice } = useStore();
  const [tab, setTab] = useState<Tab>("guide");
  const [form, setForm] = useState<Kind | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab") as Tab | null;
    if (t && ["guide", "sublets", "swaps", "roommates", "mine"].includes(t)) setTab(t);
  }, []);

  const openForm = (k: Kind) => (me.demo ? setNotice("Sign in with your UMass account to post. The demo shows example posts.") : setForm(k));

  return (
    <div className="max-w-3xl space-y-6 pb-16">
      <PageHeader title="Housing" subtitle="Dates, a moving-off-campus guide, and a board for sublets, room swaps and roommates. UMass students only." />
      <Tabs active={tab} onChange={(t) => setTab(t as Tab)} tabs={[
        { id: "guide", label: "Guide" }, { id: "sublets", label: "Sublets" }, { id: "swaps", label: "Room swaps" },
        { id: "roommates", label: "Roommates" }, { id: "mine", label: "Your posts" },
      ]} />
      <div key={version}>
        {tab === "guide" && <Guide />}
        {tab === "sublets" && <PostList kinds={["sublet_offer", "sublet_wanted"]} empty="No sublets posted yet." onPost={openForm} />}
        {tab === "swaps" && (
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">Find someone to trade on-campus rooms with. The swap itself still has to be approved by Residential Life.</p>
            <PostList kinds={["swap"]} empty="No room swaps posted yet." onPost={openForm} />
          </div>
        )}
        {tab === "roommates" && <Roommates onPost={openForm} />}
        {tab === "mine" && <Mine />}
      </div>
      {form && <PostForm kind={form} onClose={() => setForm(null)} onPosted={() => { setNotice("Posted. It stays up for 90 days."); setVersion((v) => v + 1); setTab("mine"); }} />}
    </div>
  );
}
