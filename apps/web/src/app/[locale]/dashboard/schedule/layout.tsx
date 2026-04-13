import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DashboardScheduleSubNav } from "@/components/dashboard/dashboard-schedule-sub-nav";

export default async function DashboardScheduleLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("dashboard.schedulePage");
  const tCommon = await getTranslations("common");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        </div>
        <Link
          href="/book"
          className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {tCommon("bookLesson")}
        </Link>
      </header>

      <DashboardScheduleSubNav />

      {children}
    </div>
  );
}
