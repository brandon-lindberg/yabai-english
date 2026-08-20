import { beforeEach, describe, expect, test, vi } from "vitest";
import { LessonTier } from "@/generated/prisma/client";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    lessonProduct: { findMany: vi.fn() },
    teacherProfile: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { GET } from "@/app/api/lesson-products/route";

describe("GET /api/lesson-products payment method gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.lessonProduct.findMany.mockResolvedValue([
      {
        id: "trial",
        tier: LessonTier.FREE_TRIAL,
        active: true,
        durationMin: 20,
        nameEn: "Free trial",
        nameJa: "無料体験",
      },
      {
        id: "standard",
        tier: LessonTier.STANDARD,
        active: true,
        durationMin: 60,
        nameEn: "Standard 60",
        nameJa: "標準 60",
      },
    ]);
  });

  test("teacher with no enabled payment methods exposes free trial only", async () => {
    prismaMock.teacherProfile.findUnique.mockResolvedValue({
      offersFreeTrial: true,
      paymentPolicyAcceptedAt: new Date("2026-05-01T00:00:00.000Z"),
      paymentAccounts: [],
      lessonOfferings: [
        {
          id: "offer-1",
          durationMin: 60,
          rateYen: 5000,
          isGroup: false,
          active: true,
          classTypeId: "type-1",
          classType: { id: "type-1", code: "grammar", labelEn: "Grammar", labelJa: null },
          groupSize: null,
        },
      ],
    });

    const res = await GET(
      new Request("http://localhost/api/lesson-products?teacherProfileId=teacher-1"),
    );
    const body = await res.json();

    expect(body.map((p: { id: string }) => p.id)).toEqual(["trial"]);
  });

  test("teacher with one enabled Stripe card method exposes paid products and method metadata", async () => {
    prismaMock.teacherProfile.findUnique.mockResolvedValue({
      offersFreeTrial: true,
      paymentPolicyAcceptedAt: new Date("2026-05-01T00:00:00.000Z"),
      paymentAccounts: [
        {
          id: "payacct-1",
          provider: "STRIPE",
          providerAccountId: "acct_123",
          status: "ENABLED",
          chargesEnabled: true,
          payoutsEnabled: true,
          methods: [{ method: "CARD", enabled: true }],
        },
      ],
      lessonOfferings: [
        {
          id: "offer-1",
          durationMin: 60,
          rateYen: 5000,
          isGroup: false,
          active: true,
          classTypeId: "type-1",
          classType: { id: "type-1", code: "grammar", labelEn: "Grammar", labelJa: null },
          groupSize: null,
        },
      ],
    });

    const res = await GET(
      new Request("http://localhost/api/lesson-products?teacherProfileId=teacher-1"),
    );
    const body = await res.json();

    expect(body.map((p: { id: string }) => p.id)).toEqual(["trial", "standard"]);
    expect(body.find((p: { id: string }) => p.id === "standard")).toEqual(
      expect.objectContaining({
        paymentMethods: [
          expect.objectContaining({
            provider: "STRIPE",
            method: "CARD",
            logoLabel: "Stripe",
          }),
        ],
      }),
    );
  });

  test("teacher with enabled methods but no payment policy acceptance exposes free trial only", async () => {
    prismaMock.teacherProfile.findUnique.mockResolvedValue({
      offersFreeTrial: true,
      paymentPolicyAcceptedAt: null,
      paymentAccounts: [
        {
          id: "payacct-1",
          provider: "STRIPE",
          providerAccountId: "acct_123",
          status: "ENABLED",
          chargesEnabled: true,
          payoutsEnabled: true,
          methods: [{ method: "CARD", enabled: true }],
        },
      ],
      lessonOfferings: [
        {
          id: "offer-1",
          durationMin: 60,
          rateYen: 5000,
          isGroup: false,
          active: true,
          classTypeId: "type-1",
          classType: { id: "type-1", code: "grammar", labelEn: "Grammar", labelJa: null },
          groupSize: null,
        },
      ],
    });

    const res = await GET(
      new Request("http://localhost/api/lesson-products?teacherProfileId=teacher-1"),
    );
    const body = await res.json();

    expect(body.map((p: { id: string }) => p.id)).toEqual(["trial"]);
  });
});
