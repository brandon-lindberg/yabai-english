import { getTranslations } from "next-intl/server";
import { PlacementQuiz } from "@/components/placement-quiz";
import { PageHeader } from "@/components/ui/page-header";
import { AppCard } from "@/components/ui/app-card";

export default async function PlacementPage() {
  const t = await getTranslations("placement");

  return (
    <main className="mx-auto max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <PageHeader title={t("title")} description={t("pageIntro")} />
      <AppCard className="mt-8">
        <PlacementQuiz />
      </AppCard>
    </main>
  );
}
