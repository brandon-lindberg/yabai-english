import { expect, test } from "vitest";
import { learnerCalendar } from "../calendar-rules";
import { achievementCollection } from "../gallery";

function fromDates(study: string[], lessons: string[] = [], partial: string[] = []) {
  const calendar = learnerCalendar();
  for (const day of [...new Set([...study, ...lessons, ...partial])].sort()) {
    calendar.add({ day, study: study.includes(day), lesson: lessons.includes(day) });
  }
  return calendar.evidence;
}

test("study days, streaks, and mixed weeks use distinct days and Monday boundaries", () => {
  const days = ["2026-11-16", "2026-11-17", "2026-11-18"];
  expect(fromDates(days, ["2026-11-15"])).toMatchObject({ studyDays: 3, studyStreak: 4, mixedWeek: 0 });
  expect(fromDates(days, ["2026-11-22"])).toMatchObject({ studyDays: 3, studyStreak: 3, mixedWeek: 1 });
  const study = Array.from({ length: 250 }, (_, day) => new Date(Date.UTC(2025, 0, day + 1)).toISOString().slice(0, 10));
  const lessons = Array.from({ length: 12 }, (_, week) => study[week * 7]);
  const cards = achievementCollection(fromDates(study, lessons)).filter(award => award.qualified);
  expect(cards.filter(award => /^(study-(streak|days)|lesson-weeks)-/.test(award.id))).toHaveLength(11);
});

test("lessons bridge the study streak and earn its badge with flashcard dates", () => {
  const evidence = fromDates(["2026-11-16", "2026-11-18"], ["2026-11-16", "2026-11-17"], ["2026-11-19"]);
  expect(evidence).toMatchObject({ studyDays: 2, studyStreak: 3, mixedWeek: 0 });
  expect(achievementCollection(evidence).find(badge => badge.id === "study-streak-0003")?.qualified).toBe(true);
});

test("a partial review interrupts inactivity but never counts as a study day or earns a comeback", () => {
  expect(fromDates(["2026-01-01", "2026-01-15"]).comeback).toBe(13);
  expect(fromDates(["2026-01-01", "2026-01-16"]).comeback).toBe(14);
  expect(fromDates(["2026-01-01", "2026-01-16"], [], ["2026-01-15"]).comeback).toBe(0);
  expect(fromDates(["2026-01-01"], ["2026-04-02"]).comeback).toBe(90);
});

test("a comeback cannot use untracked historical days as evidence of inactivity", () => {
  const calendar = learnerCalendar("2026-03-01");
  calendar.add({ day: "2026-01-01", study: false, lesson: true });
  calendar.add({ day: "2026-04-02", study: true, lesson: false });
  expect(calendar.evidence.comeback).toBe(0);
  calendar.add({ day: "2026-04-17", study: false, lesson: true });
  expect(calendar.evidence.comeback).toBe(14);
});

test("irregular persistence requires a substantial span and three separate gaps", () => {
  const days = ["2026-01-01", "2026-01-05", "2026-01-09", "2026-01-13", "2026-01-14", "2026-01-15",
    "2026-01-16", "2026-01-17", "2026-01-18", "2026-01-30"];
  expect(fromDates(days.slice(1)).irregular).toBe(0);
  expect(fromDates([...days.slice(0,-1), "2026-01-19"]).irregular).toBe(0);
  expect(fromDates(days).irregular).toBe(1);
});

test("loyalty needs fresh activity, sufficient active months, and a reached clamped anniversary", () => {
  const study = ["2024-02-29", "2024-04-29", "2024-05-28"];
  expect(fromDates(study).loyalty3).toBe(0);
  expect(fromDates([...study, "2024-05-29"]).loyalty3).toBe(1);
  expect(fromDates(["2024-02-29", "2024-05-29", "2024-07-29", "2024-08-29"]).loyalty6).toBe(1);
  const later = ["2024-02-29", "2024-05-29", "2024-07-29", "2024-08-29", "2024-09-29", "2024-11-29", "2025-01-29"];
  expect(fromDates(later).loyalty12).toBe(0);
  expect(fromDates(later, ["2025-02-28"]).loyalty12).toBe(1);
});
