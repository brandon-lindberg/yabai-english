import { beforeEach, expect, test, vi } from "vitest";
const { site, authMock } = vi.hoisted(() => ({ site: vi.fn(), authMock: vi.fn() }));
vi.mock("@/lib/learning-site-request", () => ({ getRequestLearningSite: site }));
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "en", getTranslations: async () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({ Link: () => null, redirect: vi.fn() }));
beforeEach(() => { authMock.mockResolvedValue(null); });
test.each(["ENGLISH", "JAPANESE"])("%s domain root serves its own landing without a language chooser", async (learningLanguage) => {
  site.mockResolvedValue({ learningLanguage });
  const { default: Home } = await import("@/app/[locale]/page");
  const result = await Home();
  expect(result.props).toMatchObject({ learningLanguage });
});

test("the installed app uses its domain's product name and existing shared assets", async () => {
  site.mockResolvedValue({ learningLanguage: "JAPANESE", brandName: "Japanese Studio" });
  const { default: manifest } = await import("@/app/manifest");
  expect(await manifest()).toMatchObject({ name: "Japanese Studio", start_url: "/" });
});
