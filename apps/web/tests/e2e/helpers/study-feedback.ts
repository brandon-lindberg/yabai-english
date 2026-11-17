import { expect, type Page } from "@playwright/test";

/** The result and action stay together, with readings opposite the meaning. */
export async function expectCompactStudyFeedback(page: Page, labels: {
  result: string; next: string; reading: string; meanings: string;
}) {
  const result = await page.getByRole("heading", { name: labels.result, exact: true }).boundingBox();
  const next = await page.getByRole("button", { name: labels.next, exact: true }).boundingBox();
  expect(result).not.toBeNull(); expect(next).not.toBeNull();
  expect(Math.abs(result!.y + result!.height / 2 - next!.y - next!.height / 2)).toBeLessThanOrEqual(1);
  expect(next!.x).toBeGreaterThan(result!.x + result!.width);
  expect(next!.height).toBeGreaterThanOrEqual(44);
  const feedback = page.getByRole("status").filter({ has: page.getByRole("heading", { name: labels.result, exact: true }) });
  const reading = await feedback.getByText(labels.reading, { exact: true }).boundingBox();
  const meanings = await feedback.getByText(labels.meanings, { exact: true }).boundingBox();
  const bounds = await feedback.boundingBox();
  expect(reading).not.toBeNull(); expect(meanings).not.toBeNull(); expect(bounds).not.toBeNull();
  expect(Math.abs(reading!.y - meanings!.y)).toBeLessThanOrEqual(1);
  expect(meanings!.x).toBeGreaterThan(reading!.x + reading!.width);
  expect(Math.abs(next!.x + next!.width - bounds!.x - bounds!.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(meanings!.x + meanings!.width - bounds!.x - bounds!.width)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
