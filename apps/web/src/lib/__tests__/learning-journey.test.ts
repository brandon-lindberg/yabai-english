import { expect, test } from "vitest";
import { journeyPath, journeySignInHref, learningLanguageFromPath } from "../learning-journey";
import { buildStudentOnboardingChecklist } from "../student-onboarding-next-links";
import { getStudentPostOnboardingRoute } from "../onboarding-routing";
import { getHeaderPrimaryNavLinks } from "../shell/header-nav-links";

test.each([
  ["ENGLISH", "/learn-english"], ["JAPANESE", "/learn-japanese"],
] as const)("%s has its own canonical journey and signup intent", (language, path) => {
  expect(journeyPath(language)).toBe(path);
  for (const prefix of ["", "/ja", "/en"]) {
    expect(learningLanguageFromPath(`${prefix}${path}`)).toBe(language);
  }
  const url = new URL(journeySignInHref(language), "https://example.test");
  expect(url.pathname).toBe("/auth/signin");
  expect(url.searchParams.get("learningLanguage")).toBe(language);
});

test("a locale prefix and arbitrary lookalike paths never select a subject", () => {
  for (const path of ["/ja", "/en", "/en/book", "/learn-japanese-other", "/learn-japanese/unknown"]) {
    expect(learningLanguageFromPath(path)).toBeNull();
  }
});

test("Japanese navigation and onboarding keep their own placement and shared subject-aware study route", () => {
  const links = getHeaderPrimaryNavLinks({ signedIn: true, role: "STUDENT", canStartPlacement: true, learningLanguage: "JAPANESE" });
  expect(links.map((link) => link.href)).not.toContain("/placement");
  expect(links.map((link) => link.href)).toContain("/learn/study");
  expect(links.map((link) => link.href)).toContain("/book");
  const checklist = buildStudentOnboardingChecklist({ locale: "en", canStartPlacement: true, learningLanguage: "JAPANESE" });
  expect(checklist.find(item => item.key === "placement")?.href).toContain("/japanese-placement?");
  expect(checklist.find(item => item.key === "materials")?.href).toContain("/learn/study?");
  expect(getStudentPostOnboardingRoute("ADVANCED", "JAPANESE")).toBe("/onboarding/next");
});
