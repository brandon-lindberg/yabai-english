"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

type ThreadRow = {
  id: string;
  studentReportedAt: string | null;
  teacherReportedAt: string | null;
  studentReportReason: string | null;
  teacherReportReason: string | null;
  updatedAt: string;
  student: { id: string; name: string | null; email: string | null };
  teacher: { id: string; name: string | null; email: string | null };
};

export function AdminReportsTable() {
  const t = useTranslations("admin.reportsPage");
  const [items, setItems] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/reports/chat-threads");
        const data = (await res.json()) as { items?: ThreadRow[]; error?: string };
        if (!res.ok) {
          if (!cancelled) setError(data.error ?? "Error");
          return;
        }
        if (!cancelled) setItems(data.items ?? []);
      } catch {
        if (!cancelled) setError("Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div
        className="overflow-x-auto rounded-xl border border-border"
        role="status"
        aria-busy="true"
        aria-label={t("loading")}
        data-testid="admin-reports-loading"
      >
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-[var(--app-hover)]">
              <th className="px-3 py-2">{t("thread")}</th>
              <th className="px-3 py-2">{t("studentReport")}</th>
              <th className="px-3 py-2">{t("teacherReport")}</th>
              <th className="px-3 py-2">{t("when")}</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-3 py-2 align-top">
                  <div className="space-y-2">
                    <Skeleton height="3" width="3/4" />
                    <Skeleton height="3" width="2/3" />
                  </div>
                </td>
                <td className="px-3 py-2 align-top">
                  <Skeleton height="3" width="1/2" />
                  <div className="mt-2">
                    <Skeleton height="3" width="3/4" />
                  </div>
                </td>
                <td className="px-3 py-2 align-top">
                  <Skeleton height="3" width="1/2" />
                  <div className="mt-2">
                    <Skeleton height="3" width="3/4" />
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Skeleton height="3" width="2/3" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (error) {
    return <p className="text-sm text-[var(--app-warning-text)]">{error}</p>;
  }
  if (items.length === 0) {
    return <p className="text-sm text-muted">{t("empty")}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-[var(--app-hover)]">
            <th className="px-3 py-2">{t("thread")}</th>
            <th className="px-3 py-2">{t("studentReport")}</th>
            <th className="px-3 py-2">{t("teacherReport")}</th>
            <th className="px-3 py-2">{t("when")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0">
              <td className="px-3 py-2 align-top">
                <div className="space-y-1">
                  <div>
                    <span className="text-muted">S: </span>
                    <Link
                      href={`/admin/users/${row.student.id}`}
                      className="text-link hover:underline"
                    >
                      {row.student.name ?? row.student.email}
                    </Link>
                  </div>
                  <div>
                    <span className="text-muted">T: </span>
                    <Link
                      href={`/admin/users/${row.teacher.id}`}
                      className="text-link hover:underline"
                    >
                      {row.teacher.name ?? row.teacher.email}
                    </Link>
                  </div>
                </div>
              </td>
              <td className="px-3 py-2 align-top text-xs">
                {row.studentReportedAt ? (
                  <>
                    <p>{new Date(row.studentReportedAt).toLocaleString()}</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted">
                      {row.studentReportReason ?? "—"}
                    </p>
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-2 align-top text-xs">
                {row.teacherReportedAt ? (
                  <>
                    <p>{new Date(row.teacherReportedAt).toLocaleString()}</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted">
                      {row.teacherReportReason ?? "—"}
                    </p>
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-2 text-xs text-muted">
                {new Date(row.updatedAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
