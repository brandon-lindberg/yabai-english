import { getLocale, getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { auth } from "@/auth";

export default async function HomePage() {
  const t = await getTranslations("home");
  const session = await auth();
  if (session) {
    const locale = await getLocale();
    redirect({ href: "/dashboard", locale });
  }

  return (
    <>
      <main className="mx-auto flex max-w-5xl flex-1 flex-col gap-10 px-4 py-16 sm:px-6">
        <section className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-accent">
            English Studio
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-lg text-muted">{t("subtitle")}</p>
          <div className="flex flex-wrap gap-3 pt-4">
            <Link
              href="/auth/signin"
              className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {t("ctaDashboard")}
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
