"use client";

import { useEffect } from "react";

const RESET_KEY = "officia-sw-reset-2026-07-02-1";

export function ServiceWorkerReset() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(RESET_KEY) === "done") return;

    let cancelled = false;

    async function resetServiceWorkerCache() {
      try {
        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
        }

        if ("caches" in window) {
          const names = await caches.keys();
          await Promise.all(names.map((name) => caches.delete(name)));
        }

        if (!cancelled) {
          window.localStorage.setItem(RESET_KEY, "done");
          window.location.reload();
        }
      } catch {
        window.localStorage.setItem(RESET_KEY, "done");
      }
    }

    resetServiceWorkerCache();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
