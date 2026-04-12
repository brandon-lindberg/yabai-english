import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { StudyRpgSnapshot } from "@/lib/study/rpg-xp";
import { StudyRpgXpBar } from "@/components/study/study-rpg-xp-bar";
import { DashboardProfileBioPreview } from "@/components/dashboard/dashboard-profile-bio-preview";

type Props = {
  name: string | null;
  email: string | null;
  image: string | null;
  shortBio: string | null;
  rpg: StudyRpgSnapshot | null;
};

export async function DashboardProfileSummary({ name, email, image, shortBio, rpg }: Props) {
  const t = await getTranslations("dashboard.highlights");
  const ts = await getTranslations("study");
  const display = name ?? email ?? "—";
  const initial = display.slice(0, 2).toUpperCase();

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border bg-foreground/5">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted">
              {initial}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{display}</p>
          <DashboardProfileBioPreview
            key={shortBio ?? ""}
            markdown={shortBio ?? ""}
            emptyLabel={t("profileCardEmpty")}
          />
          {rpg ? (
            <StudyRpgXpBar
              variant="compact"
              title={ts("rpgRankTitle", { rank: rpg.rank })}
              fractionLabel={ts("rpgXpLine", {
                into: rpg.xpIntoRank,
                total: rpg.xpForNextRank,
              })}
              nextHint={ts("rpgNextHint", {
                remaining: Math.max(0, rpg.xpForNextRank - rpg.xpIntoRank),
                nextRank: rpg.rank + 1,
              })}
              progressPercent={rpg.progressPercent}
            />
          ) : null}
          <Link href="/dashboard/profile" className="mt-3 inline-block text-sm font-medium text-link">
            {t("profileCardEdit")}
          </Link>
        </div>
      </div>
    </div>
  );
}
