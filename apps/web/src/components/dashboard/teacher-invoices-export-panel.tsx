"use client";

import { useTranslations } from "next-intl";
import { Field, Select } from "@/components/ui/field";
import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";

export type TeacherInvoiceStudentOption = {
  id: string;
  label: string;
};

const invoiceLinkClassName =
  buttonClasses();

export function TeacherInvoicesExportPanel({
  studentOptions,
}: {
  studentOptions: TeacherInvoiceStudentOption[];
}) {
  const t = useTranslations("dashboard.invoicesPage");
  const [studentId, setStudentId] = useState<string>("all");
  const exportHref = `/api/teacher/invoices/export?studentId=${encodeURIComponent(studentId)}`;

  return (
    <div className="space-y-4 border-t border-border pt-6">
      <Field label={t("studentFilterLabel")} className="max-w-md">
        {(field) => (
          <Select
            {...field}
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
          >
            <option value="all">{t("optionAllStudents")}</option>
            {studentOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <p className="text-sm text-muted">{t("csvHint")}</p>
      <a href={exportHref} className={invoiceLinkClassName}>
        {t("downloadCsv")}
      </a>
    </div>
  );
}
