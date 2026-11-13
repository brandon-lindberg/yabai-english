import { getTranslations } from "next-intl/server";
import { AdminChatReports } from "@/components/admin/admin-chat-reports";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";

export default async function AdminReportsPage() {
  const t = await getTranslations("admin");
  return (
    <main>
      <PageHeader title={t("nav.reports")} />
      <Section title={t("reportsPage.title")} description={t("reportsPage.subtitle")} ruled={false}>
        <AdminChatReports />
      </Section>
    </main>
  );
}
