"use client";

import { useCallback, useEffect, useState } from "react";
import { checkedApi } from "./features";

export function useResource<T>(path: string, validate: (value: unknown) => value is T) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{ path: string; data: T | null; error: string | null }>({ path, data: null, error: null });
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setState({ path, data: null, error: null });
    checkedApi(path, validate, controller.signal).then((data) => {
      if (!controller.signal.aborted) setState({ path, data, error: null });
    }).catch((e) => {
      if (!controller.signal.aborted) setState({ path, data: null, error: e instanceof Error ? e.message : "Couldn't load this section." });
    });
    return () => controller.abort();
  }, [path, validate, version]);
  return { data: state.path === path ? state.data : null, error: state.path === path ? state.error : null, reload };
}
