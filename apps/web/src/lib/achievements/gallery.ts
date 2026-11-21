import catalogue from "./visible-catalogue";
import { xpToAdvanceFromRank } from "@/lib/study/rpg-xp";

type Evidence = { cards: number; rank: number; lessons: number; completedLevels: number };

// Calendar and lifetime-mastery badges require dated evidence beyond these totals.
function milestone(id: string): { metric: keyof Evidence; target: number } | null {
  if (id === "level-first") return { metric: "completedLevels", target: 1 };
  const [metric, tier] = id.split("-");
  if (metric === "cards" || metric === "rank" || metric === "lessons") {
    return { metric, target: Number(tier) };
  }
  return null;
}

const definitions = catalogue.map(card => ({ ...card, milestone: milestone(card.id) }));
const studyMilestones = definitions.filter(({ milestone }) => milestone && milestone.metric !== "lessons").map(card => {
  let rankXp = 0;
  if (card.milestone?.metric === "rank") {
    for (let rank = 1; rank < card.milestone.target; rank++) rankXp += xpToAdvanceFromRank(rank);
  }
  return { ...card, rankXp };
});
export const hiddenAchievementCount = 3;
export const galleryPageSize = 8;

export const studyCardAwardLimit = Math.max(...definitions.flatMap(({ milestone }) =>
  milestone?.metric === "cards" ? [milestone.target] : [],
));

export function crossedStudyMilestones({ newCardTotal, totalXp, xpGained, firstLevelCompleted }: {
  newCardTotal?: number;
  totalXp: number;
  xpGained: number;
  firstLevelCompleted?: boolean;
}) {
  return studyMilestones.filter(({ milestone, rankXp }) => {
    if (milestone?.metric === "cards") return newCardTotal === milestone.target;
    if (milestone?.metric === "rank") return totalXp - xpGained < rankXp && rankXp <= totalXp;
    return milestone?.metric === "completedLevels" && firstLevelCompleted;
  });
}

export function achievementCollection(evidence: Evidence) {
  return definitions.map(({ milestone, ...card }) => {
    const progress = milestone && {
      value: Math.min(evidence[milestone.metric], milestone.target),
      target: milestone.target,
    };
    return { ...card, progress, qualified: progress !== null && progress.value >= progress.target };
  });
}
