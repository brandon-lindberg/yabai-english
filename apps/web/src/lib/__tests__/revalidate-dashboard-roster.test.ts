import { beforeEach, describe, expect, test, vi } from "vitest";

const { revalidatePathMock } = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/i18n/routing", () => ({
  routing: { locales: ["en", "ja"] },
}));

import { revalidateDashboardStudentRosterPaths } from "../revalidate-dashboard-roster";

describe("revalidateDashboardStudentRosterPaths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("revalidates roster page for each locale", () => {
    revalidateDashboardStudentRosterPaths();
    expect(revalidatePathMock).toHaveBeenCalledWith("/en/dashboard/students");
    expect(revalidatePathMock).toHaveBeenCalledWith("/ja/dashboard/students");
  });
});
