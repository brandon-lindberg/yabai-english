import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { getRecentLearnerAchievements } from "@/lib/achievements/recent";

export function DashboardRecentAchievements({ achievements, locale, label }: {
  achievements: Awaited<ReturnType<typeof getRecentLearnerAchievements>>;
  locale: string;
  label: string;
}) {
  return (
    <section aria-labelledby="dashboard-recent-achievements" className="flex h-full flex-col justify-center gap-2">
      <h2 id="dashboard-recent-achievements" className="text-sm font-semibold text-foreground">{label}</h2>
      <ul className="flex gap-1 md:flex-wrap">
        {achievements.map(({ id, title }, index) => {
          const name = title[locale === "ja" ? 1 : 0];
          return (
            <li key={id} className={index < 3 ? "min-w-0" : "hidden md:block"}>
              <Link
                href={{ pathname: "/dashboard/art-gallery", query: { view: "collected", piece: id } }}
                prefetch={false}
                title={name}
                className="grid h-11 w-11 max-w-full place-items-center rounded-sm border border-border bg-surface p-[3px] hover:bg-[var(--app-hover)]"
              >
                <Image src={`/achievements/${id}.png`} alt={name} width={36} height={36} unoptimized className="h-auto max-w-full [image-rendering:pixelated]" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
