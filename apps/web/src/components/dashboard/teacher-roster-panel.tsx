"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

type Scope = "active" | "archived";

type Entry = {
  id: string;
  status: "active" | "pending";
  displayName: string | null;
  email: string | null;
  studentUserId: string | null;
  archivedAtIso: string | null;
};

async function fetchTeacherRosterEntries(scope: Scope): Promise<Entry[]> {
  const query = scope === "archived" ? "?scope=archived" : "";
  const res = await fetch(`/api/teacher/roster${query}`, { cache: "no-store" });
  if (!res.ok) return [];
  const body = (await res.json()) as { entries: Entry[] };
  return body.entries;
}

export function TeacherRosterPanel() {
  const t = useTranslations("dashboard.studentsPage");
  const router = useRouter();
  const [scope, setScope] = useState<Scope>("active");
  /*
    Held with the scope it was fetched for, so switching tabs shows the loading
    state without a synchronous setState inside the effect — which React warns
    about, and which would cascade a render on every scope change.
  */
  const [loaded, setLoaded] = useState<{ scope: Scope; entries: Entry[] } | null>(null);
  const entries = loaded?.scope === scope ? loaded.entries : null;
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoaded({ scope, entries: await fetchTeacherRosterEntries(scope) });
  }, [scope]);

  useEffect(() => {
    let cancelled = false;
    void fetchTeacherRosterEntries(scope).then((next) => {
      if (!cancelled) setLoaded({ scope, entries: next });
    });
    return () => {
      cancelled = true;
    };
  }, [scope]);

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

  /**
   * Archiving is not removing. It hides the student from this list and from
   * completed lessons while keeping every booking, invoice and note, and it is
   * undone by the Restore button on the Archived tab.
   */
  async function setArchived(id: string, archived: boolean) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/teacher/roster/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived }),
      cache: "no-store",
    });
    setBusy(false);
    if (!res.ok) {
      setError(t("archiveError"));
      return;
    }
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

  const archivedView = scope === "archived";

  const tabs = (
    <div role="tablist" aria-label={t("title")} className="flex gap-1 border-b border-border">
      {(["active", "archived"] as const).map((value) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={scope === value}
          onClick={() => setScope(value)}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            scope === value
              ? "border-foreground text-foreground"
              : "border-transparent text-muted hover:text-foreground"
          }`}
        >
          {value === "active" ? t("activeTab") : t("archivedTab")}
        </button>
      ))}
    </div>
  );

  if (entries === null) {
    return (
      <div className="space-y-6">
        {tabs}
        <p className="text-sm text-muted">{t("loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {tabs}
      {archivedView ? <p className="text-sm text-muted">{t("archivedIntro")}</p> : null}
      <form
        onSubmit={addStudent}
        className={`flex-wrap items-end gap-3 ${archivedView ? "hidden" : "flex"}`}
      >
        <Field label={t("emailLabel")} required className="min-w-[240px] flex-1">
          {(field) => (
            <Input
              {...field}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
            />
          )}
        </Field>
        <button
          type="submit"
          disabled={busy}
          className={buttonClasses()}
        >
          {busy ? t("adding") : t("add")}
        </button>
      </form>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="border-t border-border">
        {entries.length === 0 ? (
          <p className="p-4 text-sm text-muted">{archivedView ? t("archivedEmpty") : t("empty")}</p>
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
                      <span className="ml-2 inline-block rounded-full bg-[var(--app-hover)] px-2 py-0.5 text-xs text-muted">
                        {t("pendingBadge")}
                      </span>
                    ) : null}
                    {row.email && row.displayName ? (
                      <p className="text-xs text-muted">{row.email}</p>
                    ) : null}
                  </div>
                )}
                <div className="flex shrink-0 items-center gap-4">
                  {row.archivedAtIso ? (
                    <span className="text-xs text-muted">
                      {t("archivedOn", {
                        date: new Date(row.archivedAtIso).toLocaleDateString(),
                      })}
                    </span>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void setArchived(row.id, !archivedView)}
                    className="text-sm font-medium text-foreground hover:underline disabled:opacity-50"
                  >
                    {archivedView ? t("restore") : t("archive")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removeEntry(row.id)}
                    className="text-sm font-medium text-destructive hover:underline disabled:opacity-50"
                  >
                    {t("remove")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
