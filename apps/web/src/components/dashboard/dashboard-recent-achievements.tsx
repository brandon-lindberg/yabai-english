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
      <ul className="flex flex-wrap gap-1">
        {achievements.map(({ id, title }, index) => {
          const name = title[locale === "ja" ? 1 : 0];
          return (
            <li key={id} className={index === 0 ? undefined : "hidden md:block"}>
              <Link
                href={{ pathname: "/dashboard/art-gallery", query: { view: "collected", piece: id } }}
                prefetch={false}
                title={name}
                className="grid size-11 place-items-center rounded-sm border border-border bg-surface hover:bg-[var(--app-hover)]"
              >
                <Image src={`/achievements/${id}.png`} alt={name} width={36} height={36} unoptimized className="[image-rendering:pixelated]" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
