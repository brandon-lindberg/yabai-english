import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { StudyRpgSnapshot } from "@/lib/study/rpg-xp";
import { StudyRpgXpBar } from "@/components/study/study-rpg-xp-bar";
import { MarkdownClamp } from "@/components/ui/markdown-clamp";
import { actionLinkClass } from "@/components/ui/inline-link";
import { Avatar } from "@/components/ui/avatar";

type Props = {
  name: string | null;
  email: string | null;
  image: string | null;
  shortBio: string | null;
  rpg: StudyRpgSnapshot | null;
  /** When set (e.g. teacher dashboard), overrides student-oriented default empty bio copy */
  emptyBioLabel?: string;
};

export async function DashboardProfileSummary({
  name,
  email,
  image,
  shortBio,
  rpg,
  emptyBioLabel,
}: Props) {
  const t = await getTranslations("dashboard.highlights");
  const ts = await getTranslations("study");
  const display = name ?? email ?? "—";
  const bioEmptyLabel = emptyBioLabel ?? t("profileCardEmpty");

  return (
    <div className="border-t border-border pt-5">
      <div className="flex items-start gap-4">
        <Avatar src={image} name={display} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold tracking-[-0.02em] text-foreground">{display}</p>
          <MarkdownClamp
            key={shortBio ?? ""}
            markdown={shortBio ?? ""}
            emptyLabel={bioEmptyLabel}
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
          <Link href="/dashboard/profile" className={`${actionLinkClass} mt-3 inline-block text-sm`}>
            {t("profileCardEdit")}
          </Link>
        </div>
      </div>
    </div>
  );
}
