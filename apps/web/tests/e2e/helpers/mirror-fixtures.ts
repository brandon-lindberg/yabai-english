import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import type { Page } from "@playwright/test";
import type { Fixtures } from "../../../scripts/mirror-journey-fixtures";
import { siteSessionCookie } from "../../../src/lib/site-session-cookie";
import en from "../../../messages/en.json";

const googleOrigin = "https://accounts.google.com";

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
  await followMirrorGoogleSignIn(page, email, () => page.goto(`/en/auth/signin?learningLanguage=${language}&callbackUrl=%2Fen%2Fdashboard`));
}

export async function followMirrorGoogleSignIn(page: Page, email: string, openSignIn: () => Promise<unknown>) {
  const context = page.context();
  await openSignIn();
  const origin = new URL(page.url()).origin;
  await interceptMirrorGoogleSignIn(page, () => page.getByRole("button", { name: en.auth.continueWithGoogle, exact: true }).click(), async () => {
    const { name, options } = siteSessionCookie(origin);
    const callbackName = `${options.secure ? "__Secure-" : ""}authjs.callback-url`;
    const cookie = (await context.cookies(origin)).find(cookie => cookie.name === callbackName);
    if (!cookie) throw new Error("Auth.js did not store the post-Google callback");
    const callback = new URL(decodeURIComponent(cookie.value), origin);
    if (callback.origin !== origin || callback.pathname !== "/api/auth/learning-journey") throw new Error("Unexpected mirror sign-in callback");
    const session = fixtureCommand("browser-session", { email }) as { sessionToken: string; expires: string };
    await context.addCookies([{
      name, value: session.sessionToken, url: origin, httpOnly: true, sameSite: "Lax",
      secure: options.secure, expires: Date.parse(session.expires) / 1000,
    }]);
    return callback;
  });
}

/** Chromium's request-stage interceptor sees Google even at the end of a redirect chain. */
export async function interceptMirrorGoogleSignIn(page: Page, start: () => Promise<unknown>, complete?: (authorization: URL) => Promise<URL>) {
  const browser = await page.context().newCDPSession(page);
  const intercepted = new Promise<URL>((resolve, reject) => {
    browser.once("Fetch.requestPaused", async ({ requestId, request }) => {
      try {
        const authorization = new URL(request.url);
        const callback = await complete?.(authorization);
        await browser.send("Fetch.fulfillRequest", {
          requestId, responseCode: callback ? 303 : 200,
          responseHeaders: [callback ? { name: "Location", value: callback.href } : { name: "Content-Type", value: "text/plain" }],
          ...(callback ? {} : { body: Buffer.from("Google authorization intercepted").toString("base64") }),
        });
        resolve(authorization);
      } catch (error) {
        await browser.send("Fetch.failRequest", { requestId, errorReason: "Aborted" }).catch(() => undefined);
        reject(error);
      }
    });
  });
  await browser.send("Fetch.enable", { patterns: [{ urlPattern: `${googleOrigin}/*`, requestStage: "Request" }] });
  try {
    const request = page.waitForRequest(url => new URL(url.url()).origin === googleOrigin, { timeout: 15_000 });
    const [authorization] = await Promise.all([intercepted, start(), request]);
    return authorization;
  } finally {
    await browser.detach();
  }
}
