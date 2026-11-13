import { NextRequest } from "next/server";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { GET, POST } from "../route";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), headers: vi.fn() }));
vi.mock("@/auth", () => ({ handlers: { GET: mocks.get, POST: mocks.post } }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));

const english = "http://englishstudiojapan.localhost:3100";
const japanese = "http://japanesestudio.localhost:3100";
const neutral = "http://localhost:3100";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("LEARNING_SITES_ENABLED", "true");
  vi.stubEnv("ENGLISH_SITE_URL", english);
  vi.stubEnv("JAPANESE_SITE_URL", japanese);
  vi.stubEnv("NEUTRAL_SITE_URL", neutral);
});
afterEach(() => vi.unstubAllEnvs());

function onHost(origin: string) {
  const headers = new Headers({ host: new URL(origin).host, cookie: "authjs.state=example" });
  mocks.headers.mockResolvedValue(headers);
  return headers;
}

test.each([english, japanese])("Auth.js sees the actual learning host on a Google return to %s", async origin => {
  const callback = "/api/auth/callback/google?state=test%2Bvalue&error=access_denied";
  await GET(new NextRequest(`${neutral}${callback}`, { headers: onHost(origin) }));
  const forwarded = mocks.get.mock.calls[0][0] as NextRequest;
  expect(forwarded.url).toBe(`${origin}${callback}`);
  expect(forwarded.cookies.get("authjs.state")?.value).toBe("example");
});

test("the localhost proxy leg keeps its original URL", async () => {
  const request = new NextRequest(`${neutral}/api/auth/callback/google?state=test`, { headers: onHost(neutral) });
  await GET(request);
  expect(mocks.get).toHaveBeenCalledWith(request);
});

test("preserves the original Auth.js request when learning domains are disabled", async () => {
  vi.stubEnv("LEARNING_SITES_ENABLED", "false");
  const request = new NextRequest("https://render.internal/api/auth/session", { headers: onHost(english) });
  await GET(request);
  expect(mocks.get).toHaveBeenCalledWith(request);
});

test("preserves the POST body and cookies when normalizing the origin", async () => {
  const request = new NextRequest(`${neutral}/api/auth/signout`, {
    headers: onHost(japanese), method: "POST", body: new URLSearchParams({ csrfToken: "test", callbackUrl: "/" }),
  });
  await POST(request);
  const forwarded = mocks.post.mock.calls[0][0] as NextRequest;
  expect(forwarded.url).toBe(`${japanese}/api/auth/signout`);
  expect(forwarded.method).toBe("POST");
  expect(forwarded.cookies.get("authjs.state")?.value).toBe("example");
  expect(await forwarded.text()).toBe("csrfToken=test&callbackUrl=%2F");
});
