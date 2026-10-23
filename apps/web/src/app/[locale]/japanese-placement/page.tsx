import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { JapanesePlacementAssessment } from "@/components/japanese-placement/assessment";

export async function generateMetadata() {
  const t = await getTranslations("japanesePlacement");
  return { title: t("title") };
}
export default async function JapanesePlacementPage() {
  const t = await getTranslations("japanesePlacement");
  return <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
    <PageHeader title={t("title")} description={t("pageIntro")} />
    <JapanesePlacementAssessment />
  </main>;
}
