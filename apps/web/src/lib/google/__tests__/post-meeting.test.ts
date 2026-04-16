import { beforeEach, describe, expect, test, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    googleIntegrationSettings: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { syncMeetingArtifacts } from "@/lib/google/post-meeting";

describe("syncMeetingArtifacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns placeholder references when artifact sync enabled", async () => {
    prismaMock.googleIntegrationSettings.findUnique.mockResolvedValue({
      meetConnected: true,
      artifactSyncEnabled: true,
    });
    const result = await syncMeetingArtifacts({
      organizerUserId: "teacher_1",
      bookingId: "booking_1",
    });
    expect(result.transcriptArtifactIds[0]).toContain("booking_1");
    expect(result.smartNotesIds).toHaveLength(1);
    expect(result.recordingIds).toHaveLength(1);
  });
});
