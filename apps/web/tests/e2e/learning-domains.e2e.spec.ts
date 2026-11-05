import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import { chooseInterfaceLocale, setHeaderTheme } from "./helpers/header-preferences";
import { captureRelease, releaseCases } from "./helpers/release-verification";
import { readMirrorFixtures, submitMirrorSignIn } from "./helpers/mirror-fixtures";

const sites = { ENGLISH: "http://englishstudiojapan.localhost:3100", JAPANESE: "http://japanesestudio.localhost:3100" };
async function signIn(page: import("@playwright/test").Page, language: keyof typeof sites, email: string) {
  await page.goto(`${sites[language]}/en/auth/signin?callbackUrl=%2Fen%2Fdashboard`);
  await submitMirrorSignIn(page, email);
  await expect(page).toHaveURL(/\/en\/dashboard$/);
}

for (const source of ["ENGLISH", "JAPANESE"] as const) {
  test(`one ${source} sign-in serves both sites and sign-out ends both sessions`, async ({ page, context }) => {
    const destination = source === "ENGLISH" ? "JAPANESE" : "ENGLISH";
    const student = readMirrorFixtures().users[0];
    if (source === "JAPANESE") await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, source, student.email);
    for (const language of [source, destination] as const) {
      const session = await (await page.request.get(`${sites[language]}/api/auth/session`)).json();
      expect(session?.user).toMatchObject({ id: student.id, learningLanguage: language });
    }

    await context.clearCookies({ domain: new URL(sites[destination]).hostname, name: /^authjs\.session-token(?:\.|$)/ });
    await page.getByRole("link", { name: en.learningJourney[source === "ENGLISH" ? "japanese" : "english"].switch }).click();
    await expect(page).toHaveURL(`${sites[destination]}/en`);
    await page.goto(`${sites[destination]}/en/dashboard`);
    await expect(page).toHaveURL(`${sites[destination]}/en/dashboard`);
    await context.clearCookies({ domain: new URL(sites[source]).hostname, name: /^authjs\.session-token(?:\.|$)/ });
    await page.goto(`${sites[source]}/en/auth/signin?callbackUrl=%2Fen%2Fdashboard%2Fschedule`);
    await expect(page).toHaveURL(`${sites[source]}/en/dashboard/schedule`);
    await context.clearCookies({ domain: new URL(sites[destination]).hostname, name: /^authjs\.session-token(?:\.|$)/ });
    await page.goto(`${sites[destination]}/en`);
    await page.locator("header").getByRole("link", { name: en.common.signIn, exact: true }).click();
    await expect(page).toHaveURL(`${sites[destination]}/en/book`);
    await page.getByRole("button", { name: en.common.accountMenu, exact: true }).click();
    await page.getByRole("button", { name: en.common.signOut, exact: true }).click();
    await expect.poll(async () => (await (await page.request.get(`${sites[destination]}/api/auth/session`)).json())?.user).toBeFalsy();
    const otherSession = await (await page.request.get(`${sites[source]}/api/auth/session`)).json();
    expect(otherSession?.user).toBeFalsy();
  });
}

test("a handoff code can only be redeemed once in PostgreSQL", async ({ page, context }) => {
  await signIn(page, "ENGLISH", readMirrorFixtures().users[0].email);
  await context.clearCookies({ domain: new URL(sites.JAPANESE).hostname, name: /^authjs\.session-token(?:\.|$)/ });
  const start = await page.request.get(`${sites.JAPANESE}/api/auth/site-session?flow=switch&locale=en`, { maxRedirects: 0 });
  expect(start.status()).toBe(303);
  const state = start.headersArray().find(({ name }) => name.toLowerCase() === "set-cookie")!.value.split(";")[0];
  const authorize = await page.request.get(start.headers().location, { maxRedirects: 0 });
  expect(authorize.status()).toBe(303);
  const completion = authorize.headers().location;
  expect(new URL(completion).searchParams.get("code")).toBeTruthy();
  const redeem = () => page.request.get(completion, { maxRedirects: 0, headers: { cookie: state } });
  const results = await Promise.all([redeem(), redeem()]);
  const issued = results.filter(response => response.headersArray().some(({ name, value }) =>
    name.toLowerCase() === "set-cookie" && value.startsWith("authjs.session-token=")));
  expect(issued).toHaveLength(1);
});

test("three landing pages link to the right brand, and bookmarked subject paths canonicalize", async ({ page }) => {
  for (const language of ["ENGLISH", "JAPANESE"] as const) {
    await page.goto(`${sites[language]}/en`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(language === "JAPANESE" ? "Learn Japanese" : "Learn English");
    await expect(page.locator("header")).toContainText(language === "JAPANESE" ? "Japanese Studio" : "English Studio Japan");
  }
  await page.goto("http://localhost:3100/en/choose-language");
  await expect(page.getByRole("link", { name: /^Learn Japanese/ })).toHaveAttribute("href", `${sites.JAPANESE}/en`);
  await expect(page.getByRole("link", { name: /^Learn English/ })).toHaveAttribute("href", `${sites.ENGLISH}/en`);
  await page.goto(`${sites.ENGLISH}/en/learn-japanese`);
  await expect(page).toHaveURL(`${sites.JAPANESE}/en`);
  await page.goto(`${sites.ENGLISH}/en/japanese-placement`);
  await expect(page).toHaveURL(new RegExp(`^${sites.JAPANESE}/`));
});

test("each domain isolates marketplace discovery, direct teacher links and forged bookings", async ({ page }) => {
  const fixture = readMirrorFixtures();
  for (const language of ["JAPANESE", "ENGLISH"] as const) {
    const other = language === "JAPANESE" ? "ENGLISH" : "JAPANESE";
    await page.goto(`${sites[language]}/en/book?learningLanguage=${other}`);
    const name = language === "JAPANESE" ? "Mirror QA Japanese Teacher" : "Mirror QA English Teacher";
    const wrongName = language === "JAPANESE" ? "Mirror QA English Teacher" : "Mirror QA Japanese Teacher";
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    await expect(page.getByText(wrongName, { exact: true })).toHaveCount(0);
    const wrongId = language === "JAPANESE" ? fixture.englishTeacherId : fixture.japaneseTeacherId;
    await page.goto(`${sites[language]}/en/book/teachers/${wrongId}`);
    await expect(page.getByRole("heading", { name: "404", exact: true })).toBeVisible();
    if (language === "JAPANESE") await signIn(page, language, fixture.users[0].email);
    const session = await (await page.request.get(`${sites[language]}/api/auth/session`)).json();
    expect(session.user.learningLanguage).toBe(language);
    const products = await (await page.request.get(`${sites[language]}/api/lesson-products`)).json();
    const response = await page.request.post(`${sites[language]}/api/bookings`, { data: {
      lessonProductId: products[0].id, teacherProfileId: wrongId, startsAt: new Date(Date.now() + 8 * 86400_000).toISOString(),
    } });
    expect(response.status()).toBe(409);
    const wrongApi = language === "JAPANESE" ? "/api/placement" : "/api/japanese-placement";
    expect((await page.request.get(`${sites[language]}${wrongApi}`)).status()).toBe(403);
  }
  // Merely navigating and authenticating through the domain does not mix progress/history.
  await page.goto(`${sites.JAPANESE}/en/dashboard`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.learningJourney.japanese.dashboard);
  expect((await page.request.get(`${sites.JAPANESE}/api/japanese-placement/attempts`)).status()).toBe(200);
  await page.goto("http://localhost:3100/en/book");
  await expect(page).toHaveURL("http://localhost:3100/en/choose-language");
  await page.goto(`${sites.JAPANESE}/en/dashboard/schedule`);
  const current = (await page.request.get(`${sites.JAPANESE}/api/auth/session`));
  expect((await current.json()).user.learningLanguage).toBe("JAPANESE");
});

test("admin assignment saves an explicit Japanese teaching permission and prevents English classes", async ({ page }) => {
  const fixture = readMirrorFixtures();
  const admin = fixture.users.find(user => user.id.endsWith("payment-admin"))!;
  await signIn(page, "ENGLISH", admin.email);
  await page.goto(`${sites.ENGLISH}/en/admin/users/${fixture.users[3].id}`);
  const japanese = page.getByRole("checkbox", { name: "Japanese", exact: true });
  await expect(japanese).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "English", exact: true })).not.toBeChecked();
  const saved = page.waitForResponse(res => res.url().endsWith(`/api/admin/users/${fixture.users[3].id}`) && res.request().method() === "PATCH");
  await page.getByRole("button", { name: en.admin.userDetail.save, exact: true }).click();
  expect((await saved).status()).toBe(200);
  await page.reload();
  await expect(japanese).toBeChecked();
  const newTeacher = fixture.users[1];
  expect((await page.request.patch(`${sites.ENGLISH}/api/admin/users/${newTeacher.id}`, { data: { role: "TEACHER" } })).status()).toBe(400);
  const promoted = await page.request.patch(`${sites.ENGLISH}/api/admin/users/${newTeacher.id}`, { data: { role: "TEACHER", teacherProfile: { teachingLanguages: ["JAPANESE"] } } });
  expect(promoted.status()).toBe(200);
  expect((await promoted.json()).teacherProfile.teachingLanguages).toEqual(["JAPANESE"]);
});

test("a Japanese teacher can select only their assigned subject, and a forged English class is rejected", async ({ page }) => {
  const teacher = readMirrorFixtures().users[3];
  await signIn(page, "JAPANESE", teacher.email);
  const shared = await (await page.request.get(`${sites.ENGLISH}/api/auth/session`)).json();
  expect(shared.user).toMatchObject({ id: teacher.id, role: "TEACHER" });
  await page.goto(`${sites.JAPANESE}/en/dashboard/lessons`);
  await page.getByRole("button", { name: en.dashboard.profilePage.teacherIndividualRatesAdd, exact: true }).click();
  const select = page.getByRole("dialog").getByLabel(en.learningJourney.languageTaught);
  await expect(select.locator('option[value="JAPANESE"]')).toHaveCount(1);
  await expect(select.locator('option[value="ENGLISH"]')).toHaveCount(0);
  const response = await page.request.post(`${sites.JAPANESE}/api/teacher/lesson-offerings`, { data: { learningLanguage: "ENGLISH", classLevelId: "irrelevant", classTypeId: "irrelevant", durationMin: 60, rateYen: 5000, isGroup: false, groupSize: null } });
  expect(response.status()).toBe(403);
});

test("dual-language availability picker groups English and Japanese classes", async ({ page, browser }) => {
  const fixture = readMirrorFixtures();
  const admin = fixture.users.find(user => user.id.endsWith("payment-admin"))!;
  const teacher = fixture.users[2];
  const adminPage = await browser.newPage();
  try {
    await signIn(adminPage, "ENGLISH", admin.email);
    const assignment = await adminPage.request.patch(`${sites.ENGLISH}/api/admin/users/${teacher.id}`, {
      data: { teacherProfile: { teachingLanguages: ["ENGLISH", "JAPANESE"] } },
    });
    expect(assignment.status()).toBe(200);
  } finally {
    await adminPage.close();
  }

  await signIn(page, "ENGLISH", teacher.email);
  for (const scenario of releaseCases()) {
    const copy = scenario.locale === "ja" ? ja : en;
    await page.setViewportSize({ width: scenario.width, height: 950 });
    if (scenario.locale === "ja") await chooseInterfaceLocale(page, en.common, "ja");
    const prefix = scenario.locale === "en" ? "/en" : "";
    await page.goto(`${sites.ENGLISH}${prefix}/dashboard/schedule/availability`);
    await setHeaderTheme(page, copy.common, scenario.theme);
    await page.getByRole("button", { name: copy.dashboard.calendarDay, exact: true }).click();
    await page.getByRole("button", { name: copy.dashboard.teacherAvailability.addForThisDay }).click();
    const dialog = page.getByRole("dialog");
    const picker = dialog.getByRole("combobox", { name: copy.dashboard.teacherAvailability.classOffer });
    const groups = picker.locator("optgroup");
    await expect(groups).toHaveCount(2);
    await expect(groups.nth(0)).toHaveAttribute("label", copy.learningJourney.english.name);
    await expect(groups.nth(1)).toHaveAttribute("label", copy.learningJourney.japanese.name);
    const japaneseOption = groups.nth(1).locator("option").first();
    await picker.selectOption((await japaneseOption.getAttribute("value"))!);
    await expect(picker.locator("option:checked")).toContainText(copy.learningJourney.japanese.name);
    await captureRelease(page, `dual-language-availability-${scenario.locale}`);
    await dialog.getByRole("button", { name: copy.dashboard.teacherAvailability.monthAddModalCancel, exact: true }).last().click();
  }
});

test("domain branding and admin language control fit desktop and mobile in both themes", async ({ browser }) => {
  const folder = "../../.impeccable/review/domains";
  mkdirSync(folder, { recursive: true });
  for (const size of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    for (const theme of ["light", "dark"] as const) {
      const context = await browser.newContext({ viewport: size, colorScheme: theme, reducedMotion: "reduce" });
      try {
        const page = await context.newPage();
        await page.addInitScript((theme) => localStorage.setItem("english-platform-theme", theme), theme);
        await page.goto(`${sites.JAPANESE}/en`);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await page.evaluate(() => document.fonts.ready);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: `${folder}/japanese-${size.width}-${theme}.png`, fullPage: true });
        await signIn(page, "ENGLISH", readMirrorFixtures().users.find(user => user.id.endsWith("payment-admin"))!.email);
        await page.goto(`${sites.ENGLISH}/en/admin/users/${readMirrorFixtures().users[3].id}`);
        await expect(page.getByRole("checkbox", { name: "Japanese", exact: true })).toBeChecked();
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.getByText("Loading editor…", { exact: true })).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: `${folder}/admin-${size.width}-${theme}.png`, fullPage: true });
      } finally { await context.close(); }
    }
  }
});
