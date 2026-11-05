import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import { chooseInterfaceLocale, setHeaderTheme } from "./helpers/header-preferences";
import { captureRelease, releaseCases } from "./helpers/release-verification";
import { fixtureCommand, followMirrorGoogleSignIn, interceptMirrorGoogleSignIn, readMirrorFixtures, releaseStudent } from "./helpers/mirror-fixtures";
import type { JapaneseQuickReviewQueue, JapaneseStudyQueue, JapaneseStudyQuestion, JapaneseStudyResult } from "../../src/lib/study/japanese-public";

const sites = { ENGLISH: "http://englishstudiojapan.localhost:3100", JAPANESE: "http://japanesestudio.localhost:3100" };
const googleCallback = "http://localhost:3100/api/auth/callback/google";
async function signIn(page: Page, language: keyof typeof sites, email: string) {
  await followMirrorGoogleSignIn(page, email, () => page.goto(`${sites[language]}/en/auth/signin?callbackUrl=%2Fen%2Fdashboard`));
  await expect(page).toHaveURL(/\/en\/dashboard$/);
}

function japaneseAnswer(learnerId: string, question: JapaneseStudyQuestion) {
  return fixtureCommand("release-study-answer", { learnerId, promptId: question.id });
}

function japaneseStudyPost(page: Page, path: "queue" | "quick-review" | "reviews") {
  return page.waitForResponse(response => response.url().endsWith(`/api/japanese-study/${path}`) && response.request().method() === "POST");
}

async function answerJapaneseCard(page: Page, learnerId: string, question: JapaneseStudyQuestion) {
  const answer = japaneseAnswer(learnerId, question);
  const choice = question.choices.find(option => option.id === answer.choiceId)!;
  const saved = japaneseStudyPost(page, "reviews");
  await page.getByRole("button", { name: choice.text, exact: true }).click();
  const response = await saved;
  expect(response.status()).toBe(200);
  const result = await response.json() as JapaneseStudyResult;
  expect(result.correct).toBe(true);
  return result.feedback;
}

test("Japanese N5 practice loads and saves with or without a placement result", async ({ page }) => {
  const learner = releaseStudent("study-student");
  await signIn(page, "ENGLISH", learner.email);
  await page.getByRole("link", { name: en.learningJourney.japanese.switch, exact: true }).click();
  await expect(page).toHaveURL(`${sites.JAPANESE}/en`);
  fixtureCommand("release-study-publish");
  try {
    for (const placementBand of [null, "N5"]) {
      if (placementBand) fixtureCommand("release-japanese-n5-award", { learnerId: learner.id });
      await page.goto(`${sites.JAPANESE}/en/learn/study`);
      const overview = await page.request.get(`${sites.JAPANESE}/api/japanese-study`);
      expect(await overview.json()).toMatchObject({ placementBand, unlocked: ["N5"] });
      const n5 = page.getByRole("article", { name: "N5", exact: true });
      const queueResponse = japaneseStudyPost(page, "queue");
      await n5.getByRole("link", { name: en.study.practice, exact: true }).click();
      const queue = await queueResponse;
      expect(queue.status()).toBe(200);
      const { cards } = await queue.json() as JapaneseStudyQueue;
      await answerJapaneseCard(page, learner.id, cards[0].question);
      await expect(page.getByRole("button", { name: en.study.nextCard, exact: true })).toBeVisible();
    }
  } finally {
    fixtureCommand("release-study-hide");
  }
});

test("completed Japanese quick review shows the same five cards in a Dashboard row after reload", async ({ page }) => {
  const learner = releaseStudent("resume-english");
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, "JAPANESE", learner.email);
  fixtureCommand("release-study-publish");
  try {
    const api = `${sites.JAPANESE}/api/japanese-study`;
    const seed = await page.request.post(`${api}/queue`, { data: { levelCode: "N5", limit: 5 } });
    expect(seed.status()).toBe(200);
    const practice = await seed.json() as JapaneseStudyQueue;
    expect(practice.cards).toHaveLength(5);
    for (const [index, { question }] of practice.cards.entries()) {
      const answer = japaneseAnswer(learner.id, question);
      const choiceId = index === 0 ? question.choices.find(choice => choice.id !== answer.choiceId)!.id : answer.choiceId;
      const saved = await page.request.post(`${api}/reviews`, { data: { ...answer, choiceId } });
      expect(saved.status()).toBe(200);
    }

    await page.reload();
    const review = page.getByRole("region", { name: en.japaneseStudy.quickTitle });
    const deck = review.getByRole("list", { name: en.japaneseStudy.dailyDeckLabel });
    const cards = deck.getByRole("listitem");
    const issued = japaneseStudyPost(page, "quick-review");
    await review.getByRole("button", { name: en.japaneseStudy.quickStart }).click();
    const queue = await issued;
    expect(queue.status()).toBe(200);
    const daily = await queue.json() as JapaneseQuickReviewQueue;
    expect(daily.cards).toHaveLength(5);
    expect(daily.cards[0].question.unitId).toBe(practice.cards[0].question.unitId);
    const reviewed: JapaneseStudyResult["feedback"][] = [];
    for (const { question } of daily.cards) {
      reviewed.push(await answerJapaneseCard(page, learner.id, question));
      const next = reviewed.length === daily.cards.length ? en.japaneseStudy.showDailyDeck : en.study.nextCard;
      await review.getByRole("button", { name: next, exact: true }).click();
    }
    const frontLabels = reviewed.map(({ written }) => `${written} · ${en.dashboard.quickReview.tapToFlip}`);
    const assertDesktopRow = async () => {
      await expect(cards).toHaveCount(5);
      for (const [index, label] of frontLabels.entries()) {
        await expect(cards.nth(index).getByRole("button", { name: label, exact: true })).toBeVisible();
      }
      const boxes = await cards.evaluateAll(items => items.map(item => {
        const { width, y } = item.getBoundingClientRect();
        return { width, y };
      }));
      expect(new Set(boxes.map(box => box.y)).size).toBe(1);
      expect(Math.min(...boxes.map(box => box.width))).toBeGreaterThanOrEqual(140);
      expect(await deck.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    };
    await assertDesktopRow();
    await expect(review.getByRole("link", { name: en.study.backToHub })).toHaveCount(0);
    const kanji = Math.max(0, reviewed.findIndex(feedback => feedback.onyomi?.length || feedback.kunyomi?.length));
    const card = cards.nth(kanji);
    const feedback = reviewed[kanji];
    await card.getByRole("button", { name: frontLabels[kanji], exact: true }).press("Enter");
    await expect(card.getByRole("button", { name: `${feedback.written} · ${en.dashboard.quickReview.tapToFlipBack}`, exact: true })).toBeFocused();
    if (feedback.meanings.length) await expect(card.getByText(feedback.meanings.join(", "), { exact: true })).toBeVisible();
    await captureRelease(page, "JAPANESE-quick-review-recap-desktop");
    await page.reload();
    await assertDesktopRow();

    await page.setViewportSize({ width: 390, height: 850 });
    await setHeaderTheme(page, en.common, "dark");
    await expect(cards).toHaveCount(1);
    await expect(deck.getByRole("button", { name: frontLabels[0], exact: true })).toBeVisible();
    expect(await deck.evaluate(el => el.scrollWidth <= el.clientWidth && document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await captureRelease(page, "JAPANESE-quick-review-recap-mobile");
    await cards.scrollIntoViewIfNeeded();
    const bounds = (await cards.boundingBox())!;
    const touch = await page.context().newCDPSession(page);
    await touch.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
    const gesture = async (dx: number, dy: number) => {
      const x = bounds.x + bounds.width / 2;
      const y = bounds.y + bounds.height / 2;
      await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x - dx / 2, y: y - dy / 2 }] });
      if (dx || dy) {
        for (const step of [-0.25, 0, 0.25, 0.5]) {
          await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + dx * step, y: y + dy * step }] });
        }
      }
      await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    };
    await gesture(-100, 0);
    await expect(review.getByText("Card 2 of 5", { exact: true })).toBeVisible();
    await expect(deck.getByRole("button", { name: frontLabels[1], exact: true })).toBeVisible();
    await gesture(100, 0);
    await expect(review.getByText("Card 1 of 5", { exact: true })).toBeVisible();
    await expect(deck.getByRole("button", { name: frontLabels[0], exact: true })).toBeVisible();
    await gesture(0, 0);
    await expect(deck.getByRole("button", { name: `${reviewed[0].written} · ${en.dashboard.quickReview.tapToFlipBack}`, exact: true })).toBeVisible();
    await review.getByRole("button", { name: en.dashboard.next, exact: true }).press("Enter");
    await expect(review.getByText("Card 2 of 5", { exact: true })).toBeVisible();
    await cards.scrollIntoViewIfNeeded();
    const beforePan = await page.evaluate(() => scrollY);
    await gesture(0, 100);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(beforePan);
    await expect(review.getByText("Card 2 of 5", { exact: true })).toBeVisible();
    await touch.detach();
  } finally {
    fixtureCommand("release-study-hide");
  }
});

test("sign-in and signup show a Google button before opening the only provider", async ({ page, context }) => {
  for (const [language, width] of [["ENGLISH", 1440], ["JAPANESE", 390]] as const) {
    const copy = language === "JAPANESE" ? ja : en;
    const prefix = copy === en ? "/en" : "";
    const origin = sites[language];
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: copy === en ? "light" : "dark" });
    await page.goto(`${origin}/${copy === en ? "en" : "ja"}`);
    expect(Object.keys(await (await page.request.get(`${origin}/api/auth/providers`)).json())).toEqual(["google"]);
    await page.locator("header").getByRole("link", { name: copy.common.signIn, exact: true }).click();
    const googleButton = page.getByRole("button", { name: copy.auth.continueWithGoogle, exact: true });
    await expect(googleButton).toBeVisible();
    expect(new URL(page.url()).origin).toBe(origin);
    expect((await context.cookies(origin)).some(cookie => cookie.name.includes("pkce"))).toBe(false);
    await expect(page.locator('input[type="email"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await googleButton.boundingBox())!.height).toBeGreaterThanOrEqual(44);

    await page.goto(`${origin}${prefix}/auth/signup`);
    await expect(googleButton).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(`${prefix}/auth/signin`);
    const google = await interceptMirrorGoogleSignIn(page, () => googleButton.click());
    await expect(page).toHaveURL(/^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?/);
    expect(google.searchParams.get("redirect_uri")).toBe(googleCallback);
    expect(google.searchParams.get("code_challenge_method")).toBe("S256");

    const failure = `${origin}${prefix}/auth/error?error=Configuration`;
    await interceptMirrorGoogleSignIn(page, () => page.goto(failure));
    await page.goto(failure);
    await expect(page.getByRole("alert")).toHaveText(copy.auth.signInRetry);
    await expect(googleButton).toBeVisible();
    await expect(page.locator('input[type="email"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test("the localhost Google callback creates a shared login from either learning site", async ({ page, context }) => {
  const student = readMirrorFixtures().users[0];
  for (const origin of Object.values(sites)) {
    await context.clearCookies();
    await page.goto(`${origin}/en/auth/signin?callbackUrl=%2Fen%2Fdashboard`);
    const google = await interceptMirrorGoogleSignIn(page, () => page.getByRole("button", { name: en.auth.continueWithGoogle, exact: true }).click());
    const state = google.searchParams.get("state");
    expect(state).toBeTruthy();
    const callback = new URL(googleCallback);
    callback.search = new URLSearchParams({ state: state!, code: student.email }).toString();
    const forwarded = page.waitForResponse(response => response.url() === callback.href);
    await page.goto(callback.href);
    expect(new URL((await forwarded).headers().location).origin).toBe(origin);
    await expect(page).toHaveURL(`${origin}/en/dashboard`);
    for (const [learningLanguage, site] of Object.entries(sites)) {
      const session = await (await page.request.get(`${site}/api/auth/session`)).json();
      expect(session?.user).toMatchObject({ id: student.id, learningLanguage });
    }
  }
});

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
    await expect(page.getByRole("button", { name: /^Notifications/ })).toBeEnabled();
    await page.getByRole("button", { name: en.common.accountMenu, exact: true }).click();
    const signedOut = page.waitForResponse(response => new URL(response.url()).pathname === "/api/auth/signout" && response.request().method() === "POST");
    await page.getByRole("button", { name: en.common.signOut, exact: true }).click();
    expect((await signedOut).ok()).toBe(true);
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
