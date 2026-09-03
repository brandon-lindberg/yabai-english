// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import { TeacherLessonOfferingsForm } from "../teacher-lesson-offerings-form";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const p = en.dashboard.profilePage;

const classLevels = [
  { id: "lvl-beginner", code: "beginner", labelEn: "Beginner", labelJa: null },
];
const classTypes = [
  { id: "type-conversation", code: "conversation", labelEn: "Conversation", labelJa: null },
];

const individualClass = {
  id: "offer-1",
  durationMin: 30,
  rateYen: 3300,
  groupTotalRateYen: null,
  ratePriceBasis: "TAX_INCLUDED",
  isGroup: false,
  groupSize: null,
  classLevelId: "lvl-beginner",
  classTypeId: "type-conversation",
};

const groupClass = {
  id: "offer-group",
  durationMin: 60,
  rateYen: 4000,
  groupTotalRateYen: 16_000,
  ratePriceBasis: "TAX_INCLUDED",
  isGroup: true,
  groupSize: 4,
  classLevelId: "lvl-beginner",
  classTypeId: "type-conversation",
};

function renderForm(
  offerings: Array<Record<string, unknown>> = [individualClass],
  offersFreeTrial = false,
) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TeacherLessonOfferingsForm
        initialOffersFreeTrial={offersFreeTrial}
        initialLessonOfferings={offerings as never}
        classLevels={classLevels}
        classTypes={classTypes}
      />
    </NextIntlClientProvider>,
  );
}

function rowFor(heading: string) {
  return within(screen.getByText(heading).closest("li")!);
}

beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
});

describe("TeacherLessonOfferingsForm — the list", () => {
  test("shows both sections and the trial setting", () => {
    renderForm();

    expect(screen.getByText(p.teacherRatesByDurationTitle)).toBeInTheDocument();
    expect(screen.getByText(p.teacherGroupRatesTitle)).toBeInTheDocument();
    expect(screen.getByText(p.teacherOffersFreeTrialLabel)).toBeInTheDocument();
  });

  // The row reads; the dialog edits. Six controls per class — one of them a
  // two-option toggle — overwhelmed the row they belonged to.
  test("lists a class rather than offering its fields inline", () => {
    renderForm();

    expect(screen.getByText("Beginner · Conversation · 30 min")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  test("says what one student pays for a private lesson", () => {
    renderForm();

    expect(screen.getByText(/¥3,300/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(p.teacherClassPriceStudentsPay))).toBeInTheDocument();
  });

  test("says the share, the full-class total and the seat count for a group class", () => {
    renderForm([groupClass]);

    expect(screen.getByText(/¥4,000 per student · ¥16,000 when full/)).toBeInTheDocument();
    expect(screen.getByText(/Max 4/)).toBeInTheDocument();
  });

  test("warns on the row when a group class outruns the Meet limit", () => {
    renderForm([{ ...groupClass, durationMin: 90 }]);

    expect(screen.getByText(/ends group calls after 60 minutes/i)).toBeInTheDocument();
  });

  test("keeps individual and group classes in their own sections", () => {
    renderForm([individualClass, groupClass]);

    expect(screen.getByText("Beginner · Conversation · 30 min")).toBeInTheDocument();
    expect(screen.getByText("Beginner · Conversation · 60 min")).toBeInTheDocument();
  });

  test("says so when a section is empty", () => {
    renderForm([individualClass]);

    expect(screen.getByText(p.teacherGroupRatesEmpty)).toBeInTheDocument();
  });

  // These live in the same table but are not the teacher's to price.
  test("does not list the free trial or an admin-granted class", () => {
    renderForm([
      individualClass,
      { ...individualClass, id: "trial", durationMin: 20, isFreeTrial: true },
      {
        ...individualClass,
        id: "granted",
        durationMin: 45,
        adminRateOverrideByUserId: "admin-1",
      },
    ]);

    expect(screen.getByText("Beginner · Conversation · 30 min")).toBeInTheDocument();
    expect(screen.queryByText(/20 min/)).not.toBeInTheDocument();
    expect(screen.queryByText(/45 min/)).not.toBeInTheDocument();
  });
});

describe("TeacherLessonOfferingsForm — editing", () => {
  test("opens the dialog on the class you asked to change", () => {
    renderForm([individualClass]);

    fireEvent.click(
      rowFor("Beginner · Conversation · 30 min").getByRole("button", {
        name: p.teacherUpdateRate,
      }),
    );

    expect(screen.getByText(p.teacherEditClassTitle)).toBeInTheDocument();
    // Prefilled with what that class already costs.
    expect(screen.getByDisplayValue("3300")).toBeInTheDocument();
  });

  test("opens an empty dialog when adding", () => {
    renderForm([individualClass]);

    fireEvent.click(screen.getByRole("button", { name: p.teacherIndividualRatesAdd }));

    expect(screen.getByText(p.teacherAddClassIndividualTitle)).toBeInTheDocument();
    expect(screen.queryByDisplayValue("3300")).not.toBeInTheDocument();
  });

  test("opens the group dialog on a group class", () => {
    renderForm([groupClass]);

    fireEvent.click(
      rowFor("Beginner · Conversation · 60 min").getByRole("button", {
        name: p.teacherUpdateRate,
      }),
    );

    // The class total, shown back as it was entered.
    expect(screen.getByDisplayValue("16000")).toBeInTheDocument();
    expect(screen.getByLabelText(p.teacherGroupSizeLabel)).toBeInTheDocument();
  });

  test("updates the row in place once the dialog saves", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          offering: { ...individualClass, rateYen: 5500, durationMin: 40 },
        }),
      }),
    );
    renderForm([individualClass]);

    fireEvent.click(
      rowFor("Beginner · Conversation · 30 min").getByRole("button", {
        name: p.teacherUpdateRate,
      }),
    );
    fireEvent.change(screen.getByDisplayValue("3300"), { target: { value: "5500" } });
    fireEvent.click(screen.getByRole("button", { name: p.teacherEditClassConfirm }));

    await waitFor(() =>
      expect(screen.getByText("Beginner · Conversation · 40 min")).toBeInTheDocument(),
    );
    expect(screen.getByText(/¥5,500/)).toBeInTheDocument();
    // Changed, not duplicated.
    expect(screen.queryByText("Beginner · Conversation · 30 min")).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  test("adds a new row when the dialog creates one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          offering: { ...individualClass, id: "offer-2", durationMin: 90, rateYen: 9900 },
        }),
      }),
    );
    renderForm([individualClass]);

    fireEvent.click(screen.getByRole("button", { name: p.teacherIndividualRatesAdd }));
    fireEvent.change(screen.getByRole("textbox", { name: p.teacherRateYenLabelTaxIncluded }), {
      target: { value: "9900" },
    });
    fireEvent.click(screen.getByRole("button", { name: p.teacherAddClassConfirm }));

    await waitFor(() =>
      expect(screen.getByText("Beginner · Conversation · 90 min")).toBeInTheDocument(),
    );
    expect(screen.getByText("Beginner · Conversation · 30 min")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});

describe("TeacherLessonOfferingsForm — everything saves itself", () => {
  test("offers no Save button, because there is nothing left to save", () => {
    renderForm();

    expect(screen.queryByRole("button", { name: p.save })).not.toBeInTheDocument();
  });

  test("saves the free trial setting the moment it is toggled", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    fireEvent.click(
      screen.getByRole("checkbox", { name: new RegExp(p.teacherOffersFreeTrialLabel) }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls.at(-1) as unknown as [string, { body: string }];
    expect(url).toBe("/api/teacher/profile");
    expect(JSON.parse(init.body)).toEqual({ offersFreeTrial: true });
    vi.unstubAllGlobals();
  });

  // Removing used to only drop the row locally, relying on Save to commit it.
  test("deletes a class on the server when it is removed", async () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: p.teacherGroupRatesRemove }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/teacher/lesson-offerings/offer-1", {
        method: "DELETE",
      }),
    );
    vi.unstubAllGlobals();
  });

  test("asks before removing a class", () => {
    const confirmMock = vi.fn().mockReturnValue(false);
    vi.stubGlobal("confirm", confirmMock);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: p.teacherGroupRatesRemove }));

    expect(confirmMock).toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  // The server refuses while availability still points at the class; the row
  // must stay put rather than vanishing from a list it is still in.
  test("keeps the class listed when the server refuses to delete it", async () => {
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: "Remove this class from your schedule before deleting it.",
        }),
      }),
    );
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: p.teacherGroupRatesRemove }));

    expect(
      await screen.findByText("Remove this class from your schedule before deleting it."),
    ).toBeInTheDocument();
    expect(screen.getByText("Beginner · Conversation · 30 min")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
