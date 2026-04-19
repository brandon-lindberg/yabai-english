"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { AccountStatus, Role } from "@/generated/prisma/browser";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export type AdminUserListItem = {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  locale: string;
  accountStatus: AccountStatus;
  createdAt: string;
  updatedAt: string;
  studentProfile: {
    placedLevel: string;
    placementNeedsReview: boolean;
    timezone: string;
  } | null;
  teacherProfile: {
    displayName: string | null;
    rateYen: number | null;
    calendarConnected: boolean;
  } | null;
};

type ListResponse = {
  items: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
};

type SortValue =
  | "createdAt_desc"
  | "createdAt_asc"
  | "email_desc"
  | "email_asc"
  | "name_desc"
  | "name_asc"
  | "role_desc"
  | "role_asc"
  | "accountStatus_desc"
  | "accountStatus_asc";

const columnHelper = createColumnHelper<AdminUserListItem>();

/** Maps TanStack column id → `admin.grid` translation key */
const COLUMN_LABEL_KEY: Partial<
  Record<
    string,
    | "colRole"
    | "colName"
    | "colEmail"
    | "colLocale"
    | "colStatus"
    | "colCreated"
    | "colPlacedLevel"
    | "colNeedsReview"
    | "colStudentTz"
    | "colDisplayName"
    | "colRateYen"
    | "colCalendar"
  >
> = {
  role: "colRole",
  name: "colName",
  email: "colEmail",
  locale: "colLocale",
  accountStatus: "colStatus",
  createdAt: "colCreated",
  placedLevel: "colPlacedLevel",
  needsReview: "colNeedsReview",
  stuTz: "colStudentTz",
  displayName: "colDisplayName",
  rateYen: "colRateYen",
  cal: "colCalendar",
};

function defaultColumnVisibility(mode: "all" | "teachers" | "students"): VisibilityState {
  if (mode === "teachers") {
    return {
      role: false,
      placedLevel: false,
      needsReview: false,
      stuTz: false,
    };
  }
  if (mode === "students") {
    return {
      role: false,
      displayName: false,
      rateYen: false,
      cal: false,
    };
  }
  return {};
}

export function AdminUserGrid({
  columnStorageKey,
  mode,
}: {
  columnStorageKey: string;
  mode: "all" | "teachers" | "students";
}) {
  const t = useTranslations("admin.grid");
  const roleFilter: Role | undefined =
    mode === "teachers" ? "TEACHER" : mode === "students" ? "STUDENT" : undefined;

  const [rows, setRows] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sort, setSort] = useState<SortValue>("createdAt_desc");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (typeof window === "undefined") return defaultColumnVisibility(mode);
    try {
      const raw = localStorage.getItem(columnStorageKey);
      if (raw) return JSON.parse(raw) as VisibilityState;
    } catch {
      /* ignore */
    }
    return defaultColumnVisibility(mode);
  });

  useEffect(() => {
    try {
      localStorage.setItem(columnStorageKey, JSON.stringify(columnVisibility));
    } catch {
      /* ignore */
    }
  }, [columnStorageKey, columnVisibility]);

  useEffect(() => {
    const id = window.setTimeout(() => setQDebounced(q.trim()), 300);
    return () => window.clearTimeout(id);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [qDebounced, roleFilter, sort]);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (roleFilter) params.set("role", roleFilter);
    if (qDebounced) params.set("q", qDebounced);
    params.set("sort", sort);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    void (async () => {
      try {
        const res = await fetch(`/api/admin/users?${params.toString()}`, {
          signal: ac.signal,
        });
        const data = (await res.json()) as ListResponse & { error?: string };
        if (!res.ok) {
          setError(data.error ?? t("loadError"));
          setRows([]);
          setTotal(0);
          return;
        }
        setRows(data.items);
        setTotal(data.total);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setError(t("loadError"));
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [page, pageSize, qDebounced, roleFilter, sort, t]);

  const cycleSort = useCallback(
    (field: "createdAt" | "email" | "name" | "role" | "accountStatus") => {
      setSort((prev) => {
        const descKey = `${field}_desc` as SortValue;
        const ascKey = `${field}_asc` as SortValue;
        if (prev === descKey) return ascKey;
        return descKey;
      });
    },
    [],
  );

  const columns = useMemo(() => {
    const cols = [
      columnHelper.display({
        id: "actions",
        header: t("colActions"),
        cell: ({ row }) => (
          <Link
            href={`/admin/users/${row.original.id}`}
            className="text-link hover:underline"
          >
            {t("open")}
          </Link>
        ),
      }),
      columnHelper.accessor("role", {
        header: () => (
          <button
            type="button"
            className="font-semibold hover:underline"
            onClick={() => cycleSort("role")}
          >
            {t("colRole")}
          </button>
        ),
        cell: (ctx) => ctx.getValue(),
      }),
      columnHelper.accessor("name", {
        header: () => (
          <button
            type="button"
            className="font-semibold hover:underline"
            onClick={() => cycleSort("name")}
          >
            {t("colName")}
          </button>
        ),
      }),
      columnHelper.accessor("email", {
        header: () => (
          <button
            type="button"
            className="font-semibold hover:underline"
            onClick={() => cycleSort("email")}
          >
            {t("colEmail")}
          </button>
        ),
      }),
      columnHelper.accessor("locale", {
        header: t("colLocale"),
      }),
      columnHelper.accessor("accountStatus", {
        header: () => (
          <button
            type="button"
            className="font-semibold hover:underline"
            onClick={() => cycleSort("accountStatus")}
          >
            {t("colStatus")}
          </button>
        ),
      }),
      columnHelper.accessor("createdAt", {
        header: () => (
          <button
            type="button"
            className="font-semibold hover:underline"
            onClick={() => cycleSort("createdAt")}
          >
            {t("colCreated")}
          </button>
        ),
        cell: (ctx) => new Date(ctx.getValue()).toLocaleString(),
      }),
      columnHelper.accessor(
        (row) => row.studentProfile?.placedLevel ?? "—",
        {
          id: "placedLevel",
          header: t("colPlacedLevel"),
        },
      ),
      columnHelper.accessor(
        (row) => (row.studentProfile?.placementNeedsReview ? t("yes") : t("no")),
        {
          id: "needsReview",
          header: t("colNeedsReview"),
        },
      ),
      columnHelper.accessor((row) => row.studentProfile?.timezone ?? "—", {
        id: "stuTz",
        header: t("colStudentTz"),
      }),
      columnHelper.accessor(
        (row) => row.teacherProfile?.displayName ?? "—",
        {
          id: "displayName",
          header: t("colDisplayName"),
        },
      ),
      columnHelper.accessor(
        (row) =>
          row.teacherProfile?.rateYen != null ? String(row.teacherProfile.rateYen) : "—",
        {
          id: "rateYen",
          header: t("colRateYen"),
        },
      ),
      columnHelper.accessor(
        (row) => (row.teacherProfile?.calendarConnected ? t("yes") : t("no")),
        {
          id: "cal",
          header: t("colCalendar"),
        },
      ),
    ];
    return cols;
  }, [cycleSort, t]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex max-w-md flex-1 flex-col gap-1 text-sm">
          <span className="text-muted">{t("searchLabel")}</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-foreground"
            placeholder={t("searchPlaceholder")}
            type="search"
          />
        </label>
        <p className="text-sm text-muted">
          {t("sortLabel")}: {sort.replace("_", " ")}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-surface p-3">
        <p className="mb-2 text-xs font-medium text-muted">{t("columnsLabel")}</p>
        <div className="flex flex-wrap gap-3 text-sm">
          {table.getAllLeafColumns().map((col) => {
            if (col.id === "actions") return null;
            const labelKey = COLUMN_LABEL_KEY[col.id];
            return (
              <label key={col.id} className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="checkbox"
                  className="rounded border-border"
                  checked={col.getIsVisible()}
                  onChange={col.getToggleVisibilityHandler()}
                />
                <span>{labelKey ? t(labelKey) : col.id}</span>
              </label>
            );
          })}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-[var(--app-warning-text)]">{error}</p>
      ) : null}
      {loading ? (
        <p className="sr-only" role="status" aria-live="polite">
          {t("loading")}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table
          className="w-full min-w-[720px] border-collapse text-left text-sm"
          aria-busy={loading || undefined}
        >
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border bg-[var(--app-hover)]">
                {hg.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2 font-semibold text-foreground">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr
                    key={`skeleton-row-${i}`}
                    data-testid="admin-user-grid-skeleton-row"
                    className="border-b border-border last:border-0"
                  >
                    {table.getVisibleLeafColumns().map((col) => (
                      <td key={col.id} className="px-3 py-2">
                        <Skeleton height="4" width="3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2 text-foreground">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted">
          {t("pageInfo", { page, totalPages, total })}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-lg border border-border px-3 py-1 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t("prev")}
          </button>
          <button
            type="button"
            className="rounded-lg border border-border px-3 py-1 disabled:opacity-40"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("next")}
          </button>
        </div>
      </div>
    </div>
  );
}
