"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { AccountStatus, LearningLanguage, Role } from "@/generated/prisma/enums";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LocalDateTime } from "@/components/local-datetime";
import { formatYen } from "@/lib/format-money";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckRow } from "@/components/ui/check-row";
import { Field, Input, Select } from "@/components/ui/field";
import { actionLinkClass } from "@/components/ui/inline-link";
import { Status } from "@/components/ui/status";
import { adminPeopleSearch, adminPeopleSortValues, defaultPeopleQuery, type AdminPeopleQuery } from "@/lib/admin/people-query";

export type AdminUserListItem = {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  locale: string;
  learningLanguage: LearningLanguage;
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
    teachingLanguages: LearningLanguage[];
    rateYen: number | null;
    calendarConnected: boolean;
  } | null;
  memberships: Array<{
    id: string;
    orgRole: "OWNER" | "ORG_ADMIN" | "SCHOOL_ADMIN" | "TEACHER" | "STUDENT";
    status: "ACTIVE" | "INACTIVE" | "INVITED" | "PENDING_APPROVAL";
    schoolId: string | null;
    organization: { id: string; name: string };
    school: { id: string; name: string } | null;
  }>;
};

type ListResponse = {
  items: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
};

type SortValue = AdminPeopleQuery["sort"];

const columnHelper = createColumnHelper<AdminUserListItem>();

/** The sort control printed the raw enum — "Sort: createdAt desc". */
const SORT_FIELD_LABEL_KEY = {
  createdAt: "colCreated",
  email: "colEmail",
  name: "colName",
  role: "colRole",
  accountStatus: "colStatus",
} as const;
type SortField = keyof typeof SORT_FIELD_LABEL_KEY;

/** Maps TanStack column id → `admin.grid` translation key */
const COLUMN_LABEL_KEY: Partial<
  Record<
    string,
    | "colRole"
    | "colSubject"
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
    | "colOrgs"
  >
> = {
  role: "colRole",
  subject: "colSubject",
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
  orgs: "colOrgs",
};

const defaultColumnVisibility: VisibilityState = {
  email: false,
  locale: false,
  placedLevel: false,
  needsReview: false,
  stuTz: false,
  displayName: false,
  rateYen: false,
  cal: false,
  orgs: false,
};

export function AdminUserGrid({
  columnStorageKey,
  initialQuery = defaultPeopleQuery,
}: {
  columnStorageKey: string;
  initialQuery?: AdminPeopleQuery;
}) {
  const t = useTranslations("admin.grid");
  const language = useTranslations("admin.teachingLanguages");
  const locale = useLocale();

  const [rows, setRows] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(initialQuery.page);
  const { pageSize } = initialQuery;
  const [sort, setSort] = useState<SortValue>(initialQuery.sort);
  const [q, setQ] = useState(initialQuery.q ?? "");
  const [qDebounced, setQDebounced] = useState(initialQuery.q ?? "");
  const [roleFilter, setRoleFilter] = useState<Role | "">(initialQuery.role ?? "");
  const [subject, setSubject] = useState<LearningLanguage | "">(initialQuery.subject ?? "");
  const [status, setStatus] = useState<AccountStatus | "">(initialQuery.status ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    if (typeof window === "undefined") return defaultColumnVisibility;
    try {
      const raw = localStorage.getItem(columnStorageKey);
      if (raw) return JSON.parse(raw) as VisibilityState;
    } catch {
      /* ignore */
    }
    return defaultColumnVisibility;
  });

  useEffect(() => {
    try {
      localStorage.setItem(columnStorageKey, JSON.stringify(columnVisibility));
    } catch {
      /* ignore */
    }
  }, [columnStorageKey, columnVisibility]);

  useEffect(() => {
    const search = q.trim();
    if (search === qDebounced) return;
    const id = window.setTimeout(() => {
      setQDebounced(search);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [q, qDebounced]);

  const search = adminPeopleSearch({
    page, pageSize, sort, q: qDebounced, role: roleFilter || undefined,
    subject: subject || undefined, status: status || undefined,
  });
  const returnQuery = search ? `?${new URLSearchParams({ from: search })}` : "";

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    const queryString = search ? `?${search}` : "";
    if (window.location.search !== queryString) {
      window.history.replaceState(null, "", `${window.location.pathname}${queryString}`);
    }

    void (async () => {
      try {
        const res = await fetch(`/api/admin/users${queryString}`, {
          signal: ac.signal,
        });
        const data = (await res.json()) as ListResponse & { error?: string };
        if (ac.signal.aborted) return;
        if (!res.ok) {
          setError(data.error ?? t("loadError"));
          setRows([]);
          setTotal(0);
          return;
        }
        setRows(data.items);
        setTotal(data.total);
      } catch (e) {
        if (ac.signal.aborted || (e as Error).name === "AbortError") return;
        setError(t("loadError"));
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [search, t]);

  const [sortField, sortDirection] = sort.split("_") as [
    SortField,
    "asc" | "desc",
  ];

  const cycleSort = useCallback(
    (field: SortField) => {
      setPage(1);
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
      columnHelper.accessor("name", {
        enableHiding: false,
        header: () => (
          <button
            type="button"
            className="font-semibold hover:underline"
            onClick={() => cycleSort("name")}
          >
            {t("colName")}
          </button>
        ),
        cell: ({ row }) => (
          <div className="space-y-1">
            <Link href={`/admin/users/${row.original.id}${returnQuery}`} className={actionLinkClass}>
              {row.original.name || row.original.teacherProfile?.displayName || row.original.email || row.original.id}
            </Link>
            {row.original.email && (row.original.name || row.original.teacherProfile?.displayName) &&
              <div className="text-xs text-muted">{row.original.email}</div>}
          </div>
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
        cell: (ctx) => t(`roles.${ctx.getValue()}`),
      }),
      columnHelper.display({
        id: "subject",
        header: t("colSubject"),
        cell: ({ row: { original } }) => {
          const subjects = original.role === Role.TEACHER ? original.teacherProfile?.teachingLanguages
            : original.role === Role.STUDENT ? [original.learningLanguage] : [];
          return subjects?.length ? subjects.map((subject) => language(subject)).join(" · ") : "—";
        },
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
        enableHiding: false,
        header: () => (
          <button
            type="button"
            className="font-semibold hover:underline"
            onClick={() => cycleSort("accountStatus")}
          >
            {t("colStatus")}
          </button>
        ),
        cell: (ctx) => {
          const status = ctx.getValue();
          return <Status tone={status === "SUSPENDED" ? "error" : status === "ACTIVE" ? "settled" : "open"}>{t(`accessStatus.${status}`)}</Status>;
        },
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
        // Was `toLocaleString()` — the browser's locale, the runtime's zone, and
        // seconds, which wrapped the cell onto three lines.
        cell: (ctx) => (
          <LocalDateTime iso={ctx.getValue()} locale={locale} timeStyle={null} />
        ),
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
        // `String(3300)` in a column headed "Rate ¥". `formatYen` exists so the
        // currency is never a header's job.
        (row) =>
          row.teacherProfile?.rateYen != null
            ? formatYen(row.teacherProfile.rateYen, locale)
            : "—",
        {
          id: "rateYen",
          header: t("colRate"),
        },
      ),
      columnHelper.accessor(
        (row) => (row.teacherProfile?.calendarConnected ? t("yes") : t("no")),
        {
          id: "cal",
          header: t("colCalendar"),
        },
      ),
      columnHelper.display({
        id: "orgs",
        header: t("colOrgs"),
        cell: ({ row }) => {
          const memberships = row.original.memberships ?? [];
          if (!memberships.length) {
            return <span className="text-muted">{t("noOrgs")}</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {memberships.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-[var(--app-hover)] px-2 py-0.5 text-xs"
                  title={`${m.organization.name} · ${m.school?.name ?? t("orgWideScope")} · ${m.orgRole}`}
                >
                  <span className="font-medium text-foreground">
                    {m.school?.name ?? m.organization.name}
                  </span>
                  <span className="text-muted">·</span>
                  <span className="text-foreground">{m.orgRole}</span>
                </span>
              ))}
            </div>
          );
        },
      }),
    ];
    return cols;
  }, [cycleSort, language, locale, returnQuery, t]);

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
  const configurableColumns = table
    .getAllLeafColumns()
    .filter((col) => col.getCanHide());
  const configurableColumnCount = configurableColumns.length;
  const visibleColumnCount = configurableColumns.filter((col) => col.getIsVisible()).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[minmax(10rem,2fr)_repeat(3,minmax(7rem,1fr))]">
        <Field label={t("searchLabel")} className="col-span-2 lg:col-span-1">
          {(field) => (
            <Input
              {...field}
              className="min-h-11"
              type="search"
              value={q}
              maxLength={200}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("searchPlaceholder")}
            />
          )}
        </Field>
        <Field label={t("colRole")}>
          {(field) => <Select {...field} className="min-h-11" value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value as Role | ""); setPage(1); }}>
            <option value="">{t("allRoles")}</option>
            {Object.values(Role).map((item) => <option key={item} value={item}>{t(`roles.${item}`)}</option>)}
          </Select>}
        </Field>
        <Field label={t("colSubject")}>
          {(field) => <Select {...field} className="min-h-11" value={subject} onChange={(e) => { setSubject(e.target.value as LearningLanguage | ""); setPage(1); }}>
            <option value="">{t("allSubjects")}</option>
            {Object.values(LearningLanguage).map((item) => <option key={item} value={item}>{language(item)}</option>)}
          </Select>}
        </Field>
        <Field label={t("colStatus")}>
          {(field) => <Select {...field} className="min-h-11" value={status} onChange={(e) => { setStatus(e.target.value as AccountStatus | ""); setPage(1); }}>
            <option value="">{t("allStatuses")}</option>
            {Object.values(AccountStatus).map((item) => <option key={item} value={item}>{t(`accessStatus.${item}`)}</option>)}
          </Select>}
        </Field>
        <Field label={t("sortLabel")} className="lg:hidden">
          {(field) => <Select {...field} className="min-h-11 text-sm" value={sort} onChange={(e) => { setSort(e.target.value as SortValue); setPage(1); }}>
            {adminPeopleSortValues.map((value) => {
              const [field, direction] = value.split("_") as [SortField, "asc" | "desc"];
              return <option key={value} value={value}>{t(SORT_FIELD_LABEL_KEY[field])} · {t(direction === "asc" ? "sortAsc" : "sortDesc")}</option>;
            })}
          </Select>}
        </Field>
      </div>
      <p className="hidden text-sm text-muted lg:block">
        {t("sortSummary", {
          field: t(SORT_FIELD_LABEL_KEY[sortField]),
          direction: t(sortDirection === "asc" ? "sortAsc" : "sortDesc"),
        })}
      </p>

      {/*
        Thirteen checkboxes across two rows used to sit here, open, above the
        table — the largest and loudest thing on the page, in front of the data
        it exists to configure. You set columns once and then live in the rows.
        A native `<details>` keeps it one keystroke away, needs no JS, and gets
        its keyboard behaviour from the platform.
      */}
      <details className="border-t border-border pt-4">
        <summary className="cursor-pointer text-sm font-medium text-foreground underline-offset-4 hover:underline">
          {t("columnsLabel")} ({visibleColumnCount}/{configurableColumnCount})
        </summary>
        <div className="mt-3 grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
          {configurableColumns.map((col) => {
            const labelKey = COLUMN_LABEL_KEY[col.id];
            return (
              <CheckRow
                key={col.id}
                checked={col.getIsVisible()}
                onChange={() => col.toggleVisibility()}
              >
                {labelKey ? t(labelKey) : col.id}
              </CheckRow>
            );
          })}
        </div>
      </details>

      {error ? (
        <p className="text-sm text-[var(--app-warning-text)]">{error}</p>
      ) : null}
      {loading ? (
        <p className="sr-only" role="status" aria-live="polite">
          {t("loading")}
        </p>
      ) : null}

      <div className="border-y border-border">
        <table
          role="table"
          className="w-full border-collapse text-left text-sm tabular-nums max-lg:block lg:table-fixed"
          aria-busy={loading || undefined}
        >
          <thead role="rowgroup" className="max-lg:hidden">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} role="row" className="border-b border-border">
                {hg.headers.map((header) => (
                  /*
                    `aria-sort` was absent everywhere: five sortable columns, and
                    nothing told a screen reader which one was in force or which
                    way round. The buttons changed the data silently.
                  */
                  <th
                    key={header.id}
                    role="columnheader"
                    aria-sort={
                      header.column.id === sortField
                        ? sortDirection === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                    className={`break-words px-3 py-2 font-semibold text-foreground ${header.column.id === "name" ? "w-[30%]" : ""}`}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody role="rowgroup" className="max-lg:block">
            {loading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr
                    key={`skeleton-row-${i}`}
                    data-testid="admin-user-grid-skeleton-row"
                    className="border-b border-border last:border-0 max-lg:grid max-lg:grid-cols-2"
                  >
                    {table.getVisibleLeafColumns().map((col) => (
                      <td key={col.id} className="px-3 py-2">
                        <Skeleton height="4" width="3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : table.getRowModel().rows.map((row) => (
                  <tr key={row.id} role="row" className="border-b border-border last:border-0 max-lg:grid max-lg:grid-cols-2 max-lg:py-2">
                    {row.getVisibleCells().map((cell) => {
                      const key = COLUMN_LABEL_KEY[cell.column.id];
                      return (
                        <td key={cell.id} role="cell" className={`min-w-0 break-words px-3 py-2 text-foreground ${cell.column.id === "name" ? "max-lg:col-span-2" : ""}`}>
                          {key && cell.column.id !== "name" && <span className="mb-0.5 block text-xs text-muted lg:hidden">{t(key)}</span>}
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && !error && rows.length === 0 && <p className="py-5 text-sm text-muted">{t("empty")}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-muted">
          {t("pageInfo", { page, totalPages, total })}
        </p>
        <div className="flex gap-2">
          {/* Hand-rolled at `py-1` — about 28px, under the 36px `sm` floor and
              well under a comfortable target. */}
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t("prev")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
