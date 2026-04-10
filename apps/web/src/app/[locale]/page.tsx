import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";

export default async function HomePage() {
  const t = await getTranslations("home");
  const session = await auth();

  return (
    <>
      <main className="mx-auto flex max-w-5xl flex-1 flex-col gap-10 px-4 py-16 sm:px-6">
        <section className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-sky-600">
            English Studio
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">{t("subtitle")}</p>
          <div className="flex flex-wrap gap-3 pt-4">
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  {t("ctaDashboard")}
                </Link>
                <Link
                  href="/book"
                  className="inline-flex rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                >
                  {t("ctaBook")}
                </Link>
              </>
            ) : (
              <Link
                href="/dashboard"
                className="inline-flex rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {t("ctaDashboard")}
              </Link>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
