import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { inlineLinkClass } from "@/components/ui/inline-link";
import { SUPPORT_EMAIL } from "@/lib/brand";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ContactPage() {
  const t = await getTranslations("contact");

  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col px-4 py-16 sm:px-6">
      <PageHeader title={t("title")} description={t("body")} />

      <section className="border-t border-border pt-6">
        <p className="text-sm font-medium text-muted">{t("emailLabel")}</p>
        {/*
          `inlineLinkClass`, not `actionLinkClass`: this world carries no link
          colour, so a link only reads as one where it has something to contrast
          against. Standing on its own like this it has nothing, and the rule
          under it is the only thing separating it from the text above.

          The address is the link text as well as its target — nobody should
          have to hover to find out where "email us" goes, and it stays copyable
          for anyone whose machine has no mail client wired up.
        */}
        <p className="mt-1">
          <a href={`mailto:${SUPPORT_EMAIL}`} className={`${inlineLinkClass} text-lg`}>
            {SUPPORT_EMAIL}
          </a>
        </p>
      </section>
    </main>
  );
}
