"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Landing } from "@/components/Landing";
import { RadarLoader } from "@/components/RadarLoader";
import { api, ApiError, type Me } from "@/lib/api";
import { StoreProvider } from "@/lib/store";
import { MIN_LOADING_MS } from "@/lib/loading";

async function withMinimumLoading<T>(load: () => Promise<T>): Promise<T> {
  const minimum = new Promise<void>((resolve) => setTimeout(resolve, MIN_LOADING_MS));
  try {
    return await load();
  } finally {
    await minimum;
  }
}

/** Signed out: the landing page. Signed in (or in the demo): the app shell around every page. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [notice, setNotice] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  const loadMe = useCallback(async (initial = false) => {
    try {
      const load = () => api<Me>("/me");
      setMe(await (initial ? withMinimumLoading(load) : load()));
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) setNotice("UMass Radar's server isn't responding. Try again in a minute.");
      setMe(null);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("message")) setNotice(params.get("message"));
    if (params.has("error") || params.has("connected")) window.history.replaceState({}, "", window.location.pathname);
    loadMe(true);
  }, [loadMe]);

  async function loadDemo() {
    setDemoLoading(true);
    try {
      await withMinimumLoading(async () => {
        await api("/demo/load", { method: "POST" });
        await loadMe();
      });
    } catch {
      setNotice("The demo inbox didn't load. Check that the server is running and try again.");
    } finally {
      setDemoLoading(false);
    }
  }

  if (me === undefined) return <RadarLoader />;
  if (demoLoading) return <RadarLoader message="Opening your demo" />;
  if (me === null) return <Landing notice={notice} onDemo={loadDemo} demoLoading={demoLoading} />;
  return (
    <StoreProvider me={me} onSignedOut={() => setMe(null)}>
      <AppShell>{children}</AppShell>
    </StoreProvider>
  );
}
