"use client";

import { useEffect, useState } from "react";

/**
 * Loads a `{ items }` collection from an admin API route. Every admin table was
 * hand-rolling this same fetch-with-cancel dance; the shapes differ but the
 * loading, error and abort handling never did.
 */
export function useAdminCollection<T>(url: string): {
  items: T[];
  loading: boolean;
  error: string | null;
} {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const res = await fetch(url);
        const data = (await res.json()) as { items?: T[]; error?: string };
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error ?? "Error");
          return;
        }
        setItems(data.items ?? []);
      } catch {
        if (!cancelled) setError("Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { items, loading, error };
}
