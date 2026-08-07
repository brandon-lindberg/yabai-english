import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";

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
      <PageHeader title={t("title")} description={t("placeholderBody")} />
    </main>
  );
}
