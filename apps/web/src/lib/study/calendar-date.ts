export const dayMs = 86_400_000;
export const dayNumber = (day: string) => Date.parse(day + "T00:00:00Z") / dayMs;
export const monthNumber = (day: string) => +day.slice(0, 4) * 12 + +day.slice(5, 7) - 1;
export const weekNumber = (day: number) => Math.floor((day + 3) / 7);

export function daysInStudyMonth(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return date.getUTCDate();
}

export function studyWeekDays(today: string) {
  const monday = weekNumber(dayNumber(today)) * 7 - 3;
  return Array.from({ length: 7 }, (_, index) => new Date((monday + index) * dayMs).toISOString().slice(0, 10));
}
