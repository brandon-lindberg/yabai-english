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

test("Japanese navigation and onboarding cannot reuse English placement or study", () => {
  const links = getHeaderPrimaryNavLinks({ signedIn: true, role: "STUDENT", canStartPlacement: true, learningLanguage: "JAPANESE" });
  expect(links.map((link) => link.href)).not.toContain("/placement");
  expect(links.map((link) => link.href)).not.toContain("/learn/study");
  expect(links.map((link) => link.href)).toContain("/book");
  expect(buildStudentOnboardingChecklist({ locale: "en", canStartPlacement: true, learningLanguage: "JAPANESE" }).map((item) => item.key))
    .toEqual(["profile", "integrations", "bookLesson", "chat"]);
  expect(getStudentPostOnboardingRoute("ADVANCED", "JAPANESE")).toBe("/onboarding/next");
});
