import { afterEach, expect, test, vi } from "vitest";
import { configuredLearningSites, learningSiteForHost, learningSiteHref, learningSitePathLanguage, publicAppOrigin } from "../learning-sites";

const environment = { LEARNING_SITES_ENABLED: "true", ENGLISH_SITE_URL: "https://englishstudiojapan.com", JAPANESE_SITE_URL: "https://japanesestudio.love", NEUTRAL_SITE_URL: "https://studio.example" };
afterEach(() => vi.unstubAllEnvs());
test("one allowlisted map resolves both brands, a neutral hub and explicit cross-site choices", () => {
  const sites = configuredLearningSites(environment)!;
  expect(learningSiteForHost("englishstudiojapan.com", sites)?.learningLanguage).toBe("ENGLISH");
  expect(learningSiteForHost("japanesestudio.love", sites)).toMatchObject({ learningLanguage: "JAPANESE", brandName: "Japanese Studio" });
  expect(learningSiteForHost("studio.example", sites)?.learningLanguage).toBeNull();
  expect(learningSiteHref(sites, "JAPANESE", "/en/learn-japanese")).toBe("https://japanesestudio.love/en");
  expect(learningSiteHref(sites, "ENGLISH", "/dashboard?tab=overview")).toBe("https://englishstudiojapan.com/dashboard?tab=overview");
});
test("configuration is opt-in and local origins retain their ports", () => {
  expect(configuredLearningSites({})).toBeNull();
  const sites = configuredLearningSites({ ...environment, ENGLISH_SITE_URL: "http://englishstudiojapan.localhost:3100", JAPANESE_SITE_URL: "http://japanesestudio.localhost:3100", NEUTRAL_SITE_URL: "http://localhost:3100" })!;
  expect(learningSiteForHost("japanesestudio.localhost:3100", sites)?.origin).toBe("http://japanesestudio.localhost:3100");
  expect(learningSiteForHost("japanesestudio.localhost:3101", sites)).toBeNull();
});

test.each(["https://englishstudiojapan.com", "https://www.englishstudiojapan.com"])("both public English hostnames resolve to the configured origin %s", origin => {
  const env = { ...environment, ENGLISH_SITE_URL: origin };
  const sites = configuredLearningSites(env)!;
  for (const host of ["englishstudiojapan.com", "www.englishstudiojapan.com", "WWW.ENGLISHSTUDIOJAPAN.COM"]) {
    expect(learningSiteForHost(host, sites)).toMatchObject({ origin, learningLanguage: "ENGLISH" });
    expect(publicAppOrigin(new Request(`https://${host}/api/auth/callback/google`), env)).toBe(origin);
  }
  expect(learningSiteForHost("www.www.englishstudiojapan.com", sites)).toBeNull();
  expect(learningSiteForHost("englishstudiojapan.com.evil.example", sites)).toBeNull();
});

test("a public alias preserves its configured port", () => {
  const sites = configuredLearningSites({ ...environment, ENGLISH_SITE_URL: "https://www.englishstudiojapan.com:8443" })!;
  expect(learningSiteForHost("englishstudiojapan.com:8443", sites)?.origin).toBe("https://www.englishstudiojapan.com:8443");
  expect(learningSiteForHost("englishstudiojapan.com", sites)).toBeNull();
  expect(learningSiteForHost("englishstudiojapan.com:8444", sites)).toBeNull();
});

test("loopback hosts keep exact matching even when their name starts with www", () => {
  const sites = configuredLearningSites({ ...environment, ENGLISH_SITE_URL: "http://www.englishstudiojapan.localhost:3000" })!;
  expect(learningSiteForHost("www.englishstudiojapan.localhost:3000", sites)?.learningLanguage).toBe("ENGLISH");
  expect(learningSiteForHost("englishstudiojapan.localhost:3000", sites)).toBeNull();
});
test.each(["japanesestudio.love.evil.example", "japanesestudio.love@evil.example", "japanesestudio.love,evil.example", "https://japanesestudio.love", "japanesestudio.love/path"])("rejects untrusted host %s", host => {
  expect(learningSiteForHost(host, configuredLearningSites(environment)!)).toBeNull();
});
test.each(["//evil.example/path", "https://evil.example/", "/\\evil.example", "/%2f%2fevil.example"])("cross-site links cannot escape the configured domains: %s", path => {
  expect(() => learningSiteHref(configuredLearningSites(environment)!, "JAPANESE", path)).toThrow();
});
test("program-specific routes and APIs identify their domain without treating UI locale as the subject", () => {
  expect(learningSitePathLanguage("/en/japanese-placement")).toBe("JAPANESE");
  expect(learningSitePathLanguage("/api/japanese-study/queue")).toBe("JAPANESE");
  expect(learningSitePathLanguage("/ja/placement")).toBe("ENGLISH");
  expect(learningSitePathLanguage("/api/study/review")).toBe("ENGLISH");
  expect(learningSitePathLanguage("/en/learn/study")).toBeNull();
  expect(learningSitePathLanguage("/api/payments/webhooks/stripe")).toBeNull();
});

test("local and production hub links share one canonical locale-root form", () => {
  expect(learningSiteHref(configuredLearningSites(environment)!, "JAPANESE", "/en/")).toBe("https://japanesestudio.love/en");
});
