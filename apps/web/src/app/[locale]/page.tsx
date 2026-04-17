import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { AppCard } from "@/components/ui/app-card";

export default async function HomePage() {
  const t = await getTranslations("home");
  const session = await auth();

  if (session?.user) {
    return (
      <main className="mx-auto flex max-w-3xl flex-1 flex-col px-4 py-12 sm:px-6">
        <PageHeader title={t("signedInTitle")} description={t("signedInSubtitle")} />
        <div className="grid gap-4 sm:grid-cols-3">
          <AppCard padding="sm" className="flex flex-col">
            <p className="text-sm font-medium text-foreground">{t("signedInBook")}</p>
            <Link
              href="/book"
              className="mt-4 inline-flex justify-center rounded-full bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {t("ctaBook")}
            </Link>
          </AppCard>
          <AppCard padding="sm" className="flex flex-col">
            <p className="text-sm font-medium text-foreground">{t("signedInDashboard")}</p>
            <Link
              href="/dashboard"
              className="mt-4 inline-flex justify-center rounded-full border border-border px-4 py-2 text-center text-sm font-semibold text-foreground hover:bg-[var(--app-hover)]"
            >
              {t("ctaDashboard")}
            </Link>
          </AppCard>
          <AppCard padding="sm" className="flex flex-col">
            <p className="text-sm font-medium text-foreground">{t("signedInLearn")}</p>
            <Link
              href="/learn/study"
              className="mt-4 inline-flex justify-center rounded-full border border-border px-4 py-2 text-center text-sm font-semibold text-foreground hover:bg-[var(--app-hover)]"
            >
              {t("signedInLearn")}
            </Link>
          </AppCard>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col px-4 py-16 sm:px-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Link
            href="/auth/signin"
            className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {t("ctaDashboard")}
          </Link>
        }
      />
    </main>
  );
}
