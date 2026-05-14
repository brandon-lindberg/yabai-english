"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";

export type TeacherInvoiceStudentOption = {
  id: string;
  label: string;
};

const invoiceLinkClassName =
  "inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90";

export function TeacherInvoicesExportPanel({
  studentOptions,
}: {
  studentOptions: TeacherInvoiceStudentOption[];
}) {
  const t = useTranslations("dashboard.invoicesPage");
  const selectId = useId();
  const [studentId, setStudentId] = useState<string>("all");
  const exportHref = `/api/teacher/invoices/export?studentId=${encodeURIComponent(studentId)}`;

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="space-y-2">
        <label htmlFor={selectId} className="block text-sm font-medium text-foreground">
          {t("studentFilterLabel")}
        </label>
        <select
          id={selectId}
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="w-full max-w-md rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="all">{t("optionAllStudents")}</option>
          {studentOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <p className="text-sm text-muted">{t("csvHint")}</p>
      <a href={exportHref} className={invoiceLinkClassName}>
        {t("downloadCsv")}
      </a>
    </div>
  );
}
