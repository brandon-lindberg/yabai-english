import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import type { StudyRpgSnapshot } from "@/lib/study/rpg-xp";
import { StudyRpgXpBar } from "@/components/study/study-rpg-xp-bar";
import { MarkdownClamp } from "@/components/ui/markdown-clamp";
import { Avatar } from "@/components/ui/avatar";

type Props = {
  name: string | null;
  email: string | null;
  image: string | null;
  shortBio: string | null;
  rpg: StudyRpgSnapshot | null;
  /** When set (e.g. teacher dashboard), overrides student-oriented default empty bio copy */
  emptyBioLabel?: string;
  /**
   * The "Edit profile" control. Supplied by the caller because only it knows
   * whether this is a student or a teacher, and holds the profile to edit.
   * This was a link to /dashboard/profile: a page load and a second click to
   * change one line.
   */
  editSlot: ReactNode;
};

export async function DashboardProfileSummary({
  name,
  email,
  image,
  shortBio,
  rpg,
  emptyBioLabel,
  editSlot,
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
          <div className="mt-3">{editSlot}</div>
        </div>
      </div>
    </div>
  );
}
