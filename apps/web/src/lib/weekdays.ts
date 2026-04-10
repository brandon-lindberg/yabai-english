const EN = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const JA = [
  "日曜日",
  "月曜日",
  "火曜日",
  "水曜日",
  "木曜日",
  "金曜日",
  "土曜日",
];

export function weekdayLabel(dayOfWeek: number, locale: string) {
  const idx = Math.min(6, Math.max(0, dayOfWeek));
  return locale === "ja" ? JA[idx] : EN[idx];
}
