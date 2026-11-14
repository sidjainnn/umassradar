"use client";

import { useCallback, useEffect, useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { Landing } from "@/components/Landing";
import { api, ApiError, type Me } from "@/lib/api";

export default function Home() {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [notice, setNotice] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  async function loadDemo() {
    setDemoLoading(true);
    try {
      await api("/demo/load", { method: "POST" });
      await loadMe();
    } catch {
      setNotice("Couldn't load the demo inbox. Is the server running?");
    } finally {
      setDemoLoading(false);
    }
  }

  const loadMe = useCallback(async () => {
    try {
      setMe(await api<Me>("/me"));
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) setNotice("Can't reach the UMass Radar server right now.");
      setMe(null);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("message")) setNotice(params.get("message"));
    if (params.has("error") || params.has("connected")) window.history.replaceState({}, "", "/");
    loadMe();
  }, [loadMe]);

  if (me === undefined) {
    return <div className="grid min-h-screen place-items-center text-sm text-stone-400">Loading…</div>;
  }
  if (me === null) return <Landing notice={notice} onDemo={loadDemo} demoLoading={demoLoading} />;
  return <Dashboard me={me} onSignedOut={() => setMe(null)} onMeChanged={loadMe} />;
}
