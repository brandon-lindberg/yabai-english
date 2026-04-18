import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ContactPlaceholderPage() {
  const t = await getTranslations("contact");

  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">{t("placeholderBody")}</p>
    </main>
  );
}
