"use client";

import { useEffect } from "react";

/** When the URL has ?focus=<item id>, scroll that row into view and highlight it briefly. */
export function useFocusItem(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const id = new URLSearchParams(window.location.search).get("focus");
    if (!id) return;
    const el = document.getElementById(`item-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("bg-maroon-50");
    const t = setTimeout(() => el.classList.remove("bg-maroon-50"), 2500);
    return () => clearTimeout(t);
  }, [ready]);
}
