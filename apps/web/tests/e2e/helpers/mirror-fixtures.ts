import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import type { Page } from "@playwright/test";
import type { Fixtures } from "../../../scripts/mirror-journey-fixtures";
import en from "../../../messages/en.json";

export const readMirrorFixtures = (): Fixtures => JSON.parse(readFileSync("../../.impeccable/mirror-fixtures.json", "utf8"));
export function fixtureCommand(operation: string, input?: unknown) {
  return JSON.parse(execFileSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "scripts/mirror-journey-fixtures.ts", operation], { encoding: "utf8", input: input === undefined ? undefined : JSON.stringify(input), maxBuffer: 16 * 1024 * 1024, stdio: ["pipe", "pipe", "pipe"] }));
}
export function releaseStudent(name: string) {
  const student = readMirrorFixtures().users.find(user => user.id.endsWith(`-${name}`));
  if (!student) throw new Error(`Missing release student: ${name}`);
  return student;
}
export async function signInMirrorUser(page: Page, email: string, language: "ENGLISH" | "JAPANESE") {
  await page.goto(`/en/auth/signin?learningLanguage=${language}&callbackUrl=%2Fen%2Fdashboard`);
  await submitMirrorSignIn(page, email);
}
export async function submitMirrorSignIn(page: Page, email: string) {
  await page.getByLabel(en.auth.email, { exact: true }).fill(email);
  await page.getByRole("button", { name: en.auth.signInWithEmail, exact: true }).click();
}
