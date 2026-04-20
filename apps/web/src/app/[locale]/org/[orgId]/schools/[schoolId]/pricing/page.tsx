import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { SchoolPricingView } from "@/components/org/school-pricing-view";

export default async function SchoolPricingPage({
  params,
}: {
  params: Promise<{ orgId: string; schoolId: string }>;
}) {
  const { orgId, schoolId } = await params;
  const t = await getTranslations("org.school.pricingPage");

  return (
    <main>
      <PageHeader title={t("title")} description={t("description")} />
      <SchoolPricingView orgId={orgId} schoolId={schoolId} />
    </main>
  );
}
