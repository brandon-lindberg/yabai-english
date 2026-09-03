// @vitest-environment jsdom

import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../../../messages/en.json";
import { TeacherLessonAddModal } from "../teacher-lesson-add-modal";

const classLevels = [
  { id: "lvl-beginner", code: "beginner", labelEn: "Beginner", labelJa: null },
];
const classTypes = [
  { id: "type-conversation", code: "conversation", labelEn: "Conversation", labelJa: null },
];

const p = en.dashboard.profilePage;

function renderModal(kind: "individual" | "group", onAdded = vi.fn(), onClose = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={en}>
      <TeacherLessonAddModal
        open
        kind={kind}
        classLevels={classLevels}
        classTypes={classTypes}
        locale="en"
        onClose={onClose}
        onAdded={onAdded}
      />
    </NextIntlClientProvider>,
  );
  return { onAdded, onClose };
}

function confirmButton() {
  return screen.getByRole("button", { name: p.teacherAddClassConfirm });
}

function priceField(label: string) {
  return screen.getByLabelText(label);
}

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom does not implement showModal. It has to actually set `open`, or the
  // dialog's contents stay out of the accessibility tree and nothing inside it
  // is reachable by role — which is also how a real closed dialog behaves.
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
});

describe("TeacherLessonAddModal", () => {
  test("asks for what an individual class needs", () => {
    renderModal("individual");

    expect(screen.getByText(p.teacherAddClassIndividualTitle)).toBeInTheDocument();
    expect(priceField(p.teacherRateYenLabelTaxIncluded)).toBeInTheDocument();
    expect(screen.queryByLabelText(p.teacherGroupSizeLabel)).not.toBeInTheDocument();
  });

  test("asks for a size and a class total when adding a group class", () => {
    renderModal("group");

    expect(screen.getByText(p.teacherAddClassGroupTitle)).toBeInTheDocument();
    expect(screen.getByLabelText(p.teacherGroupSizeLabel)).toBeInTheDocument();
    expect(priceField(p.teacherGroupTotalLabelTaxIncluded)).toBeInTheDocument();
  });

  // The reason it saves here: a second Save further down the page is a step
  // most people miss.
  test("says it saves as soon as you add it", () => {
    renderModal("individual");

    expect(screen.getByText(p.teacherAddClassSubtitle)).toBeInTheDocument();
  });

  test("will not add a class with no price", () => {
    renderModal("individual");

    expect(confirmButton()).toBeDisabled();
  });

  test("will not add a class priced under the floor", () => {
    renderModal("individual");
    fireEvent.change(priceField(p.teacherRateYenLabelTaxIncluded), {
      target: { value: "2000" },
    });

    expect(confirmButton()).toBeDisabled();
    expect(screen.getByText(/Below the ¥3,000 minimum/)).toBeInTheDocument();
  });

  test("shows the per-student share before you commit to a group class", () => {
    renderModal("group");
    fireEvent.change(screen.getByLabelText(p.teacherGroupSizeLabel), {
      target: { value: "4" },
    });
    fireEvent.change(priceField(p.teacherGroupTotalLabelTaxIncluded), {
      target: { value: "16000" },
    });

    expect(screen.getByText(/¥4,000 per student · ¥16,000 when full/)).toBeInTheDocument();
    expect(confirmButton()).toBeEnabled();
  });

  test("warns about the Meet limit before the class exists", () => {
    renderModal("group");
    fireEvent.change(screen.getByLabelText(p.teacherDurationLabel), {
      target: { value: "90" },
    });

    expect(screen.getByText(/ends group calls after 60 minutes/i)).toBeInTheDocument();
  });

  test("saves the class and hands it back", async () => {
    const offering = {
      id: "offer-new",
      durationMin: 30,
      rateYen: 5000,
      groupTotalRateYen: null,
      ratePriceBasis: "TAX_INCLUDED",
      isGroup: false,
      groupSize: null,
      classLevelId: "lvl-beginner",
      classTypeId: "type-conversation",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ ok: true, offering }) });
    vi.stubGlobal("fetch", fetchMock);
    const { onAdded, onClose } = renderModal("individual");

    fireEvent.change(priceField(p.teacherRateYenLabelTaxIncluded), {
      target: { value: "5000" },
    });
    fireEvent.click(confirmButton());

    await waitFor(() => expect(onAdded).toHaveBeenCalledWith(offering));
    const [url, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(url).toBe("/api/teacher/lesson-offerings");
    expect(JSON.parse(init.body)).toMatchObject({
      rateYen: 5000,
      isGroup: false,
      classLevelId: "lvl-beginner",
    });
    expect(onClose).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  test("sends the class total and the share for a group class", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, offering: { id: "g1", isGroup: true } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    renderModal("group");

    fireEvent.change(screen.getByLabelText(p.teacherGroupSizeLabel), {
      target: { value: "4" },
    });
    fireEvent.change(priceField(p.teacherGroupTotalLabelTaxIncluded), {
      target: { value: "16000" },
    });
    fireEvent.click(confirmButton());

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(JSON.parse(init.body)).toMatchObject({
      isGroup: true,
      groupSize: 4,
      groupTotalRateYen: 16000,
      rateYen: 4000,
    });
    vi.unstubAllGlobals();
  });

  test("stays open and says why when the server refuses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "classLevelId does not belong to this teacher" }),
      }),
    );
    const { onAdded, onClose } = renderModal("individual");

    fireEvent.change(priceField(p.teacherRateYenLabelTaxIncluded), {
      target: { value: "5000" },
    });
    fireEvent.click(confirmButton());

    expect(
      await screen.findByText("classLevelId does not belong to this teacher"),
    ).toBeInTheDocument();
    expect(onAdded).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  test("cannot add anything before the teacher has a level and a type", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherLessonAddModal
          open
          kind="individual"
          classLevels={[]}
          classTypes={[]}
          locale="en"
          onClose={vi.fn()}
          onAdded={vi.fn()}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText(p.teacherAddClassNoTaxonomy)).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
  });
});
