import { getTranslations } from "next-intl/server";
import { PlacementQuiz } from "@/components/placement-quiz";

export default async function PlacementPage() {
  const t = await getTranslations("placement");

  return (
    <main className="mx-auto max-w-xl flex-1 px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
      <p className="mt-2 text-muted">{t("intro")}</p>
      <div className="mt-8">
        <PlacementQuiz />
      </div>
    </main>
  );
}
