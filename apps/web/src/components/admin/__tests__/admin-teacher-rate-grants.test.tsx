// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { AdminTeacherRateGrants } from "@/components/admin/admin-teacher-rate-grants";

const copy = en.admin.teacherRateGrants;

const loaded = {
  classLevels: [{ id: "lv-1", labelEn: "Beginner", labelJa: "初級" }],
  classTypes: [{ id: "ty-1", labelEn: "Conversation", labelJa: "会話" }],
  grants: [
    {
      id: "offer-1",
      durationMin: 30,
      rateYen: 1500,
      isGroup: false,
      groupSize: null,
      adminRateOverrideNote: "Pilot programme legacy rate.",
      classLevel: { labelEn: "Beginner", labelJa: "初級" },
      classType: { labelEn: "Conversation", labelJa: "会話" },
    },
  ],
};

function renderGrants() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <AdminTeacherRateGrants teacherProfileId="tp-1" />
    </NextIntlClientProvider>,
  );
}

function jsonOk(body: unknown) {
  return { ok: true, json: async () => body };
}

afterEach(() => vi.unstubAllGlobals());

describe("AdminTeacherRateGrants", () => {
  beforeEach(() => vi.clearAllMocks());

  test("shows an existing grant with its rate and the reason given", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk(loaded)));

    renderGrants();

    expect(await screen.findByText(/¥1,500/)).toBeTruthy();
    expect(screen.getByText(/Pilot programme legacy rate/)).toBeTruthy();
  });

  test("says so when nothing has been granted", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk({ ...loaded, grants: [] })));

    renderGrants();

    expect(await screen.findByText(copy.empty)).toBeTruthy();
  });

  test("grants a class from the teacher's own taxonomy", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonOk(loaded));
    vi.stubGlobal("fetch", fetchMock);

    renderGrants();
    await screen.findByText(/¥1,500/);

    fireEvent.change(screen.getByLabelText(copy.rate), { target: { value: "1200" } });
    fireEvent.change(screen.getByLabelText(copy.note), { target: { value: "School deal" } });
    fireEvent.click(screen.getByRole("button", { name: copy.grant }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/teacher-offerings",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"rateYen":1200'),
        }),
      );
    });
    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(String(postCall?.[1]?.body)).toContain('"note":"School deal"');
  });

  // Mirrors the API guard so the admin is told before the round trip.
  test("refuses to grant a rate that needs no grant", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonOk(loaded)));

    renderGrants();
    await screen.findByText(/¥1,500/);

    fireEvent.change(screen.getByLabelText(copy.rate), { target: { value: "5000" } });

    expect(screen.getByText(/need no grant/i)).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: copy.grant }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  test("revokes a grant", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonOk(loaded));
    vi.stubGlobal("fetch", fetchMock);

    renderGrants();
    await screen.findByText(/¥1,500/);

    fireEvent.click(screen.getByRole("button", { name: copy.revoke }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin/teacher-offerings?id=offer-1",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  test("says when the teacher has no taxonomy to grant against", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonOk({ classLevels: [], classTypes: [], grants: [] })),
    );

    renderGrants();

    expect(await screen.findByText(copy.noTaxonomy)).toBeTruthy();
  });
});
