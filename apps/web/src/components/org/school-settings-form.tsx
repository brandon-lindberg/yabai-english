"use client";

import { useTranslations } from "next-intl";
import { EntitySettingsForm } from "@/components/org/entity-settings-form";

export function SchoolSettingsForm({ orgId, schoolId }: { orgId: string; schoolId: string }) {
  const t = useTranslations("org.school.settingsPage");

  return (
    <EntitySettingsForm
      endpoint={`/api/org/${orgId}/schools/${schoolId}`}
      responseKey="school"
      rows={[
        [{ name: "name", label: t("schoolName"), required: true }],
        [
          { name: "nameJa", label: t("nameJa") },
          { name: "nameEn", label: t("nameEn") },
        ],
      ]}
      copy={{
        save: t("save"),
        saving: t("saving"),
        saved: t("saved"),
        error: t("error"),
      }}
    />
  );
}
