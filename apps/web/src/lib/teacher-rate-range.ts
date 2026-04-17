export type TeacherRateRange = {
  minYen: number;
  maxYen: number;
};

export function formatYenRange(range: TeacherRateRange | null): string {
  if (!range) return "JPY —";
  if (range.minYen === range.maxYen) return `JPY ${range.minYen.toLocaleString()}`;
  return `JPY ${range.minYen.toLocaleString()} - ${range.maxYen.toLocaleString()}`;
}

export function getTeacherRateRange(
  offerings: Array<{ active: boolean; rateYen: number }>,
  fallbackRateYen: number | null | undefined,
): TeacherRateRange | null {
  const rates = offerings
    .filter((o) => o.active && Number.isFinite(o.rateYen) && o.rateYen > 0)
    .map((o) => o.rateYen);
  if (rates.length === 0) {
    if (!fallbackRateYen || fallbackRateYen <= 0) return null;
    return { minYen: fallbackRateYen, maxYen: fallbackRateYen };
  }
  return {
    minYen: Math.min(...rates),
    maxYen: Math.max(...rates),
  };
}

export function getTeacherRateRangeByType(
  offerings: Array<{ active: boolean; rateYen: number; isGroup: boolean }>,
  type: "individual" | "group",
  fallbackRateYen?: number | null,
): TeacherRateRange | null {
  const filtered = offerings.filter((o) =>
    type === "group" ? o.isGroup : !o.isGroup,
  );
  return getTeacherRateRange(filtered, type === "individual" ? fallbackRateYen : null);
}
