import catalogue from "./visible-catalogue";
import { hiddenLearnerCatalogue } from "./hidden-learner-catalogue";
import { xpToAdvanceFromRank } from "@/lib/study/rpg-xp";

export type CalendarEvidence = {
  studyStreak: number; lessonWeeks: number; studyDays: number;
  loyalty3: number; loyalty6: number; loyalty12: number;
  comeback: number; irregular: number; mixedWeek: number;
};
type Evidence = { cards: number; mastered: number; rank: number; lessons: number; completedLevels: number } & CalendarEvidence;
const thresholdFamilies = {
  cards: "cards", mastery: "mastered", rank: "rank", lessons: "lessons",
  "study-streak": "studyStreak", "lesson-weeks": "lessonWeeks", "study-days": "studyDays", return: "comeback",
} as const satisfies Record<string, keyof Evidence>;
const namedMilestones: Readonly<Record<string, keyof Evidence>> = {
  "level-first": "completedLevels", "loyalty-0003m": "loyalty3", "loyalty-0006m": "loyalty6",
  "loyalty-0012m": "loyalty12", "irregular-0001": "irregular", "study-and-lessons-week": "mixedWeek",
};

function milestone(id: string): { metric: keyof Evidence; target: number } {
  const named = namedMilestones[id];
  if (named) return { metric: named, target: 1 };
  const [, family, tier] = /^(.*)-(\d+)(?:d)?$/.exec(id) ?? [];
  const metric = thresholdFamilies[family as keyof typeof thresholdFamilies];
  if (!metric || !tier || +tier < 1) throw new Error(`Missing achievement rule: ${id}`);
  return { metric, target: Number(tier) };
}

export const learnerBadges = [
  ...catalogue.map(card => ({ ...card, hidden: false })),
  ...hiddenLearnerCatalogue,
];
const definitions = learnerBadges.map(card => ({ ...card, milestone: milestone(card.id) }));
const reviewMetrics = new Set<keyof Evidence>(["cards", "mastered", "rank", "completedLevels"]);
export const calendarAchievementIds = definitions.filter(card => !reviewMetrics.has(card.milestone.metric)).map(card => card.id);
const studyMilestones = definitions.flatMap(card => {
  const { metric, target } = card.milestone;
  if (!reviewMetrics.has(metric)) return [];
  let rankXp = 0;
  if (metric === "rank") {
    for (let rank = 1; rank < target; rank++) rankXp += xpToAdvanceFromRank(rank);
  }
  return [{ ...card, rankXp }];
});
export const hiddenAchievementCount = hiddenLearnerCatalogue.length;
export const galleryPageSize = 8;

function awardLimit(metric: keyof Evidence) {
  return Math.max(...definitions.flatMap(({ milestone }) => milestone.metric === metric ? [milestone.target] : []));
}

export const studyCardAwardLimit = awardLimit("cards");
export const masteryAwardLimit = awardLimit("mastered");
export const lessonAwardLimit = awardLimit("lessons");

export function crossedStudyMilestones({ newCardTotal, newMasteredTotal, totalXp, xpGained, firstLevelCompleted }: {
  newCardTotal?: number;
  newMasteredTotal?: number;
  totalXp: number;
  xpGained: number;
  firstLevelCompleted?: boolean;
}) {
  return studyMilestones.filter(({ milestone, rankXp }) => {
    if (milestone.metric === "cards") return newCardTotal === milestone.target;
    if (milestone.metric === "mastered") return newMasteredTotal === milestone.target;
    if (milestone.metric === "rank") return totalXp - xpGained < rankXp && rankXp <= totalXp;
    return firstLevelCompleted;
  });
}

export function achievementCollection(evidence: Partial<Evidence>) {
  return definitions.map(({ milestone, ...card }) => {
    const progress = { value: Math.min(evidence[milestone.metric] ?? 0, milestone.target), target: milestone.target };
    return { ...card, progress, qualified: progress.value >= progress.target };
  });
}
