"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type Item, type Me } from "@/lib/api";

export default function Home() {
  const [me, setMe] = useState<Me | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const user = await api<Me>("/me");
      setMe(user);
      setItems(await api<Item[]>("/items"));
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) setNotice(String(e));
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("message")) setNotice(params.get("message"));
    if (params.has("error") || params.has("connected")) window.history.replaceState({}, "", "/");
    load();
  }, [load]);

  async function sync() {
    setSyncing(true);
    try {
      const r = await api<{ status: string; message?: string }>("/sync", { method: "POST" });
      if (r.status !== "ok") setNotice(r.message ?? "Sync failed");
      await load();
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return <main className="p-10 text-stone-500">Loading…</main>;

  return (
    <main className="mx-auto max-w-2xl p-6 sm:p-10">
      <h1 className="text-2xl font-semibold text-maroon-600">UMass Radar</h1>
      {notice && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}

      {!me ? (
        <a
          href="/api/auth/login"
          className="mt-8 inline-block rounded-lg bg-maroon-600 px-5 py-2.5 font-medium text-white hover:bg-maroon-700"
        >
          Sign in with Google
        </a>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-3 text-sm text-stone-600">
            <span>{me.email}</span>
            <button onClick={sync} disabled={syncing} className="rounded-md border px-3 py-1 hover:bg-white">
              {syncing ? "Syncing…" : "Sync now"}
            </button>
          </div>
          {me.needs_reconnect && (
            <a href="/api/auth/login" className="mt-4 block rounded-lg bg-maroon-50 p-3 text-sm text-maroon-700">
              Your Gmail connection expired. Reconnect Gmail →
            </a>
          )}
          <ul className="mt-6 divide-y rounded-xl border bg-white">
            {items.map((it) => (
              <li key={it.id} className="px-4 py-2.5 text-sm">
                {it.title}
              </li>
            ))}
            {items.length === 0 && <li className="px-4 py-6 text-sm text-stone-500">No items yet. Hit Sync now.</li>}
          </ul>
        </>
      )}
    </main>
  );
}
