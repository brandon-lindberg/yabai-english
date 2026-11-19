import catalogue from "./visible-catalogue";

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
export const hiddenAchievementCount = 3;
export const galleryPageSize = 8;

export function achievementCollection(evidence: Evidence) {
  return definitions.map(({ milestone, ...card }) => {
    const progress = milestone && {
      value: Math.min(evidence[milestone.metric], milestone.target),
      target: milestone.target,
    };
    return { ...card, progress, qualified: progress !== null && progress.value >= progress.target };
  });
}
