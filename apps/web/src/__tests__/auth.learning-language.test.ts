import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import type { NextAuthConfig, Session } from "next-auth";

const { captured, prismaMock } = vi.hoisted(() => ({
  captured: { config: null as NextAuthConfig | null },
  prismaMock: {
    user: { findUnique: vi.fn() },
    studentProfile: { findUnique: vi.fn() },
    organizationMembership: { findMany: vi.fn() },
  },
}));
vi.mock("next-auth", () => ({ default: (config: NextAuthConfig) => {
  captured.config = config;
  return {};
} }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

type Callbacks = NonNullable<NextAuthConfig["callbacks"]>;
type SessionArgs = Parameters<NonNullable<Callbacks["session"]>>[0];
type JwtArgs = Parameters<NonNullable<Callbacks["jwt"]>>[0];

describe("auth preserves the selected lesson subject", () => {
  beforeAll(async () => {
    vi.stubEnv("DEV_AUTH_BYPASS", "true");
    vi.stubEnv("AUTH_GOOGLE_ID", "");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "");
    await import("@/auth");
  });
  afterAll(() => vi.unstubAllEnvs());
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.studentProfile.findUnique.mockResolvedValue({ placementCompletedAt: null });
    prismaMock.organizationMembership.findMany.mockResolvedValue([]);
  });

  test.each([
    ["ENGLISH", "ja"],
    ["JAPANESE", "en"],
    ["JAPANESE", "ja"],
  ])("database sessions keep %s independent of locale %s", async (learningLanguage, locale) => {
    prismaMock.user.findUnique.mockResolvedValue({ role: "STUDENT", locale, learningLanguage, accountStatus: "ACTIVE" });
    const session = await captured.config!.callbacks!.session!({
      session: { user: {} }, user: { id: "student-1" }, token: {},
    } as SessionArgs) as Session;
    expect(session.user).toMatchObject({ locale, learningLanguage });
    expect(session.user.canStartPlacement).toBe(learningLanguage === "ENGLISH");
    if (learningLanguage === "JAPANESE") {
      expect(prismaMock.studentProfile.findUnique).not.toHaveBeenCalled();
    }
  });

  test("dev JWT refresh reads a subject switch from persistence", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ role: "STUDENT", locale: "en", learningLanguage: "JAPANESE", accountStatus: "ACTIVE" });
    const token = await captured.config!.callbacks!.jwt!({ token: { sub: "student-1", learningLanguage: "ENGLISH" } } as unknown as JwtArgs);
    expect(token?.learningLanguage).toBe("JAPANESE");
    const session = await captured.config!.callbacks!.session!({ session: { user: {} }, token } as SessionArgs) as Session;
    expect(session.user.learningLanguage).toBe("JAPANESE");
  });
});

describe("the existing Google provider serves both learning paths", () => {
  beforeAll(async () => {
    vi.resetModules();
    vi.stubEnv("DEV_AUTH_BYPASS", "true");
    vi.stubEnv("AUTH_GOOGLE_ID", "test-shared-google-client");
    vi.stubEnv("AUTH_GOOGLE_SECRET", "test-shared-google-secret");
    await import("@/auth");
  });
  afterAll(() => vi.unstubAllEnvs());
  test.each(["ENGLISH", "JAPANESE"] as const)("%s uses the same Google provider and authoritative database session", async learningLanguage => {
    vi.clearAllMocks();
    prismaMock.organizationMembership.findMany.mockResolvedValue([]);
    prismaMock.studentProfile.findUnique.mockResolvedValue({ placementCompletedAt: null });
    prismaMock.user.findUnique.mockResolvedValue({ role: "STUDENT", locale: "en", learningLanguage, accountStatus: "ACTIVE" });
    expect(captured.config!.providers).toHaveLength(1);
    expect(captured.config!.providers[0]).toMatchObject({ id: "google" });
    expect(captured.config!.session?.strategy).toBe("database");
    const result = await captured.config!.callbacks!.session!({ session: { user: {} }, user: { id: "same-account" }, token: {} } as SessionArgs) as Session;
    expect(result.user).toMatchObject({ id: "same-account", learningLanguage, locale: "en" });
  });
});
