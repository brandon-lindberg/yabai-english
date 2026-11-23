import type { CalendarEvidence } from "./gallery";
import { dayMs, dayNumber, monthNumber, weekNumber } from "@/lib/study/calendar-date";

export type ActivityDay = { day: string; study: boolean; lesson: boolean };

function anniversary(first: string, months: number) {
  const month = monthNumber(first) + months;
  const date = Math.min(+first.slice(8), new Date(Date.UTC(Math.floor(month / 12), month % 12 + 1, 0)).getUTCDate());
  return Date.UTC(Math.floor(month / 12), month % 12, date) / dayMs;
}

/** Fold sorted, distinct activity dates. Months and streak state have fixed memory. */
export function learnerCalendar(trackingStartedDay = "0001-01-01") {
  const afterFirstTrackedDay = dayNumber(trackingStartedDay);
  const evidence: CalendarEvidence = {
    studyStreak: 0, studyDays: 0, lessonWeeks: 0, loyalty3: 0, loyalty6: 0, loyalty12: 0, comeback: 0, irregular: 0, mixedWeek: 0,
  };
  let previous = -Infinity, lastStreakDay = -Infinity, lastLessonWeek = -Infinity, firstStudy = Infinity;
  let week = -Infinity, weekStudy = 0, weekLesson = false, studyRun = 0, lessonRun = 0, studyReturns = 0;
  let anniversaries: number[] | undefined;
  let months: number[] = [];
  return { evidence, add({ day, study, lesson }: ActivityDay) {
    const date = dayNumber(day);
    const thisWeek = weekNumber(date);
    const gap = Number.isFinite(previous) && previous >= afterFirstTrackedDay ? date - previous - 1 : -1;
    if (thisWeek !== week) {
      week = thisWeek;
      weekStudy = 0;
      weekLesson = false;
    }
    if (study) {
      firstStudy = Math.min(firstStudy, date);
      evidence.studyDays++;
      if (gap >= 3) studyReturns++;
      if (evidence.studyDays >= 10 && date - firstStudy >= 29 && studyReturns >= 3) evidence.irregular = 1;
      weekStudy++;
    }
    if (lesson && thisWeek !== lastLessonWeek) {
      lessonRun = thisWeek === lastLessonWeek + 1 ? lessonRun + 1 : 1;
      evidence.lessonWeeks = Math.max(evidence.lessonWeeks, lessonRun);
      lastLessonWeek = thisWeek;
      weekLesson = true;
    }
    if (weekStudy >= 3 && weekLesson) evidence.mixedWeek = 1;
    if (study || lesson) {
      studyRun = date === lastStreakDay + 1 ? studyRun + 1 : 1;
      evidence.studyStreak = Math.max(evidence.studyStreak, studyRun);
      lastStreakDay = date;
      evidence.comeback = Math.max(evidence.comeback, gap);
      anniversaries ??= [anniversary(day, 3), anniversary(day, 6), anniversary(day, 12)];
      const month = monthNumber(day);
      if (months.at(-1) !== month) months = [...months.filter(active => active > month - 12), month];
      if (date >= anniversaries[0] && months.filter(active => active > month - 3).length >= 2) evidence.loyalty3 = 1;
      if (date >= anniversaries[1] && months.filter(active => active > month - 6).length >= 3) evidence.loyalty6 = 1;
      if (date >= anniversaries[2] && months.length >= 6) evidence.loyalty12 = 1;
    }
    previous = date;
  } };
}
