"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AdminTeacherOverview } from "@/lib/admin/teacher-overview";
import { useAdminCollection } from "@/hooks/use-admin-collection";
import { offeringLabel } from "@/components/admin/admin-teacher-overview";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Status } from "@/components/ui/status";

type Option = { id: string; label: string };

function SearchSelection({ label, searchLabel, query, onSearch, selected, onSelect, options, placeholder, busy }: {
  label: string;
  searchLabel: string;
  query: string;
  onSearch: (value: string) => void;
  selected: string;
  onSelect: (value: string) => void;
  options: Option[];
  placeholder: string;
  busy?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Field label={searchLabel}>
        {(field) => <Input {...field} type="search" value={query} maxLength={200} onChange={(e) => onSearch(e.target.value)} />}
      </Field>
      <Field label={label}>
        {(field) => (
          <Select {...field} value={selected} onChange={(e) => onSelect(e.target.value)} disabled={busy || !options.length}>
            <option value="">{placeholder}</option>
            {options.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
          </Select>
        )}
      </Field>
    </div>
  );
}

export function AdminStudentRateOverride({ teacherId, offerings, permittedLanguages }: {
  teacherId: string;
  offerings: AdminTeacherOverview["offerings"];
  permittedLanguages: AdminTeacherOverview["subjects"][number]["learningLanguage"][];
}) {
  const t = useTranslations("admin.profileOverview");
  const rate = useTranslations("admin.teacherTiersPage");
  const language = useTranslations("admin.teachingLanguages");
  const locale = useLocale();
  const [studentQuery, setStudentQuery] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [studentId, setStudentId] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [offeringId, setOfferingId] = useState("");
  const [rateInput, setRateInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<"saved" | "failed" | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setStudentSearch(studentQuery.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [studentQuery]);
  const students = useAdminCollection<{ id: string; name: string | null; email: string | null }>(
    `/api/admin/users?${new URLSearchParams({ role: "STUDENT", status: "ACTIVE", q: studentSearch, pageSize: "10" })}`,
  );
  const waiting = students.loading || studentQuery.trim() !== studentSearch;
  const studentOptions = waiting || students.error ? [] : students.items.map(({ id, name, email }) => ({
    id, label: [name, email].filter(Boolean).join(" · ") || id,
  }));
  const classOptions = offerings.filter((row) => row.active && !row.isFreeTrial && permittedLanguages.includes(row.learningLanguage))
    .map((row) => ({
      id: row.id,
      label: `${language(row.learningLanguage)} · ${offeringLabel(row, locale, t("class"))} · ${t("minutes", { minutes: row.durationMin })}`,
    }))
    .filter((option) => option.label.toLocaleLowerCase(locale).includes(classSearch.trim().toLocaleLowerCase(locale)));
  const amount = Number(rateInput);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !studentOptions.some(({ id }) => id === studentId) || !classOptions.some(({ id }) => id === offeringId) || amount < 1) return;
    setBusy(true);
    setOutcome(null);
    try {
      const response = await fetch("/api/admin/teacher-student-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, studentId, teacherLessonOfferingId: offeringId, rateYen: amount, active: true }),
      });
      setOutcome(response.ok ? "saved" : "failed");
    } catch {
      setOutcome("failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void save(event)}>
      <p className="text-sm text-muted">{rate("legacyIntro")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <SearchSelection label={t("selectStudent")} searchLabel={t("searchStudents")} query={studentQuery}
          onSearch={(value) => { setStudentQuery(value); setStudentId(""); setOutcome(null); }}
          options={studentOptions} selected={studentId} onSelect={(value) => { setStudentId(value); setOutcome(null); }}
          placeholder={waiting ? t("searching") : students.error ? t("searchError") : studentOptions.length ? t("chooseStudent") : t("noStudents")}
          busy={busy || waiting} />
        <SearchSelection label={t("selectClass")} searchLabel={t("searchClasses")} query={classSearch}
          onSearch={(value) => { setClassSearch(value); setOfferingId(""); setOutcome(null); }}
          options={classOptions} selected={offeringId} onSelect={(value) => { setOfferingId(value); setOutcome(null); }}
          placeholder={classOptions.length ? t("chooseClass") : t("noMatchingClasses")} busy={busy} />
      </div>
      <Field label={rate("fieldRateYen")} className="max-w-xs">
        {(field) => <Input {...field} inputMode="numeric" maxLength={7} value={rateInput} onChange={(event) => {
          setRateInput(event.target.value.replace(/\D/g, ""));
          setOutcome(null);
        }} />}
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={busy} disabled={waiting || !studentId || !offeringId || amount < 1}>{rate("saveLegacyRate")}</Button>
        {outcome && <p role={outcome === "failed" ? "alert" : "status"}><Status tone={outcome === "saved" ? "settled" : "error"}>{t(outcome === "saved" ? "rateSaved" : "rateError")}</Status></p>}
      </div>
    </form>
  );
}
