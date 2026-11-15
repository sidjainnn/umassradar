import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, loadToken, saveToken, type Me } from "./api";

type Session = {
  me: Me | null;
  ready: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  setMode: (m: "study" | "work") => Promise<void>;
  /** a room the Map tab should open with directions to, e.g. "ILC S220" */
  target: string | null;
  setTarget: (t: string | null) => void;
};

const Ctx = createContext<Session | null>(null);
export const useSession = () => useContext(Ctx)!;

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [target, setTarget] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try { setMe(await api<Me>("/me")); } catch { setMe(null); await saveToken(null); }
  }, []);

  useEffect(() => {
    (async () => {
      if (await loadToken()) await refresh();
      setReady(true);
    })();
  }, [refresh]);

  const signIn = async (token: string) => { await saveToken(token); await refresh(); };
  const signOut = async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    await saveToken(null);
    setMe(null);
  };
  const setMode = async (m: "study" | "work") => {
    setMe((prev) => (prev ? { ...prev, mode: m } : prev));
    await api("/settings/mode", { method: "PUT", body: JSON.stringify({ mode: m }) }).catch(() => {});
  };

  return <Ctx.Provider value={{ me, ready, signIn, signOut, setMode, target, setTarget }}>{children}</Ctx.Provider>;
}
