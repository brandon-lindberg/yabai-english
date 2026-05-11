"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";

type Entry = {
  id: string;
  status: "active" | "pending";
  displayName: string | null;
  email: string | null;
  studentUserId: string | null;
};

async function fetchTeacherRosterEntries(): Promise<Entry[]> {
  const res = await fetch("/api/teacher/roster", { cache: "no-store" });
  if (!res.ok) return [];
  const body = (await res.json()) as { entries: Entry[] };
  return body.entries;
}

export function TeacherRosterPanel() {
  const t = useTranslations("dashboard.studentsPage");
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setEntries(await fetchTeacherRosterEntries());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchTeacherRosterEntries().then((next) => {
      if (!cancelled) setEntries(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void load();
      router.refresh();
    };
    document.addEventListener("visibilitychange", refresh);
    const interval = window.setInterval(refresh, 45_000);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(interval);
    };
  }, [load, router]);

  async function addStudent(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/teacher/roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
      cache: "no-store",
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? t("addError"));
      return;
    }
    setEmail("");
    await load();
  }

  async function removeEntry(id: string) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/teacher/roster/${id}`, { method: "DELETE", cache: "no-store" });
    setBusy(false);
    if (!res.ok) {
      setError(t("removeError"));
      return;
    }
    await load();
  }

  if (entries === null) {
    return <p className="text-sm text-muted">{t("loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <form onSubmit={addStudent} className="flex flex-wrap items-end gap-3">
        <label className="block min-w-[240px] flex-1 space-y-1 text-sm">
          <span className="font-medium text-foreground">{t("emailLabel")}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-foreground/25"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
        >
          {busy ? t("adding") : t("add")}
        </button>
      </form>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="rounded-xl border border-border">
        {entries.length === 0 ? (
          <p className="p-4 text-sm text-muted">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                {row.studentUserId ? (
                  <Link
                    href={`/dashboard/students/${row.studentUserId}`}
                    className="min-w-0 flex-1 rounded-lg py-0.5 text-left outline-none ring-offset-background transition hover:bg-[var(--app-hover)]/50 focus-visible:ring-2 focus-visible:ring-foreground/25"
                    aria-label={t("openStudentProfile")}
                  >
                    <span className="font-medium text-foreground">
                      {row.displayName ?? row.email ?? "—"}
                    </span>
                    {row.email && row.displayName ? (
                      <p className="text-xs text-muted">{row.email}</p>
                    ) : null}
                  </Link>
                ) : (
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-foreground">
                      {row.displayName ?? row.email ?? "—"}
                    </span>
                    {row.status === "pending" ? (
                      <span className="ml-2 inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-800 dark:text-amber-200">
                        {t("pendingBadge")}
                      </span>
                    ) : null}
                    {row.email && row.displayName ? (
                      <p className="text-xs text-muted">{row.email}</p>
                    ) : null}
                  </div>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void removeEntry(row.id)}
                  className="text-sm font-medium text-destructive hover:underline disabled:opacity-50"
                >
                  {t("remove")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
