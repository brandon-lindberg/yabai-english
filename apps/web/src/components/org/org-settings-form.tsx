"use client";

import { useTranslations } from "next-intl";
import { EntitySettingsForm } from "@/components/org/entity-settings-form";

export function OrgSettingsForm({ orgId }: { orgId: string }) {
  const t = useTranslations("org.settingsPage");

  return (
    <EntitySettingsForm
      endpoint={`/api/org/${orgId}`}
      responseKey="organization"
      rows={[
        [{ name: "name", label: t("orgName"), required: true }],
        [
          { name: "nameJa", label: t("orgNameJa") },
          { name: "nameEn", label: t("orgNameEn") },
        ],
        [{ name: "timezone", label: t("timezone") }],
        [{ name: "description", label: t("description_field"), multiline: true }],
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
