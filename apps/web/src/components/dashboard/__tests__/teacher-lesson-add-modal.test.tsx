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
        onSaved={onAdded}
      />
    </NextIntlClientProvider>,
  );
  return { onAdded, onClose };
}

function confirmButton() {
  return screen.getByRole("button", { name: p.teacherAddClassConfirm });
}

/**
 * The price input. Queried by role because the field's label and one of the
 * entry-mode options now read the same — a text box and a radio, which is how
 * a person tells them apart too.
 */
function priceField(label: string) {
  return screen.getByRole("textbox", { name: label });
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

  // The class total's tax is a figure nobody is charged: each student is
  // invoiced their own share, and the tax is computed on that invoice.
  test("breaks the tax down per seat, not on the class total", () => {
    renderModal("group");
    fireEvent.change(screen.getByLabelText(p.teacherGroupSizeLabel), {
      target: { value: "5" },
    });
    fireEvent.change(priceField(p.teacherGroupTotalLabelTaxIncluded), {
      target: { value: "20000" },
    });

    // ¥4,000 a seat: ¥363 tax, ¥3,637 to the teacher.
    expect(
      screen.getByText(/Each student pays — ¥3,637 plus ¥363 consumption tax · Total ¥4,000/),
    ).toBeInTheDocument();
    // Never the tax on ¥20,000, which nobody pays.
    expect(screen.queryByText(/1,818|1818/)).not.toBeInTheDocument();
  });

  test("reads a class total as a pre-tax figure once that mode is chosen", () => {
    renderModal("group");
    fireEvent.change(screen.getByLabelText(p.teacherGroupSizeLabel), {
      target: { value: "5" },
    });
    fireEvent.change(priceField(p.teacherGroupTotalLabelTaxIncluded), {
      target: { value: "20000" },
    });
    fireEvent.click(
      screen.getByRole("radio", { name: p.teacherRateBasisOptionExclusive }),
    );

    // ¥20,000 before tax is ¥22,000 to the class, ¥4,400 a seat.
    expect(screen.getByDisplayValue("20000")).toBeInTheDocument();
    expect(screen.getByText(/¥4,400 per student · ¥22,000 when full/)).toBeInTheDocument();
  });

  test("keeps the plain tax split for a private lesson", () => {
    renderModal("individual");
    fireEvent.change(priceField(p.teacherRateYenLabelTaxIncluded), {
      target: { value: "4000" },
    });

    // One student, one invoice: the entered figure is the seat.
    expect(
      screen.getByText(/Student pays — ¥3,637 plus ¥363 consumption tax · Total ¥4,000/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Each student pays/)).not.toBeInTheDocument();
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

  // Moved here from the inline editor: these are the price rules, and the
  // price now lives in the dialog.
  // The breakdown leads with what the student is charged. Listing the parts
  // without naming the whole left the teacher's share looking like the price.
  test("names the student price first, then how it splits", () => {
    renderModal("individual");
    fireEvent.change(priceField(p.teacherRateYenLabelTaxIncluded), {
      target: { value: "3300" },
    });

    expect(
      screen.getByText(/Student pays — ¥3,000 plus ¥300 consumption tax · Total ¥3,300/),
    ).toBeInTheDocument();
  });

  test("names the higher student price when a pre-tax fee is entered", () => {
    renderModal("individual");
    fireEvent.click(
      screen.getByRole("radio", { name: p.teacherRateBasisOptionExclusive }),
    );
    fireEvent.change(priceField(p.teacherRateYenLabelTaxExclusive), {
      target: { value: "4000" },
    });

    // The whole point of the mode: a ¥4,000 fee means the student pays ¥4,400.
    expect(
      screen.getByText(/Student pays — ¥4,000 plus ¥400 consumption tax · Total ¥4,400/),
    ).toBeInTheDocument();
  });

  // The mode says how to read the number; it does not rewrite it. A teacher
  // who types 4,000 and says "that is my fee before tax" means the student pays
  // ¥4,400 — not that their 4,000 should quietly become 3,637.
  test("keeps the typed figure when the entry mode changes", () => {
    renderModal("individual");
    fireEvent.change(priceField(p.teacherRateYenLabelTaxIncluded), {
      target: { value: "4000" },
    });

    fireEvent.click(
      screen.getByRole("radio", { name: p.teacherRateBasisOptionExclusive }),
    );

    expect(screen.getByDisplayValue("4000")).toBeInTheDocument();
    expect(screen.getByText(/Total ¥4,400/)).toBeInTheDocument();
  });

  // The minimum is on the tax-included price, so a pre-tax figure below 3,000
  // can still be fine once tax is added. Judging the typed number would refuse
  // a legitimate rate.
  test("judges the tax-included price, not the number typed", () => {
    renderModal("individual");
    fireEvent.click(
      screen.getByRole("radio", { name: p.teacherRateBasisOptionExclusive }),
    );
    fireEvent.change(priceField(p.teacherRateYenLabelTaxExclusive), {
      target: { value: "2800" },
    }); // -> ¥3,080 incl.

    expect(screen.queryByText(/Below the ¥3,000 minimum/)).toBeNull();
    expect(confirmButton()).toBeEnabled();
  });

  test("recomputes the share when the seat count changes", () => {
    renderModal("group");
    fireEvent.change(priceField(p.teacherGroupTotalLabelTaxIncluded), {
      target: { value: "12000" },
    });
    fireEvent.change(screen.getByLabelText(p.teacherGroupSizeLabel), {
      target: { value: "4" },
    });
    expect(screen.getByText(/¥3,000 per student/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(p.teacherGroupSizeLabel), {
      target: { value: "3" },
    });
    expect(screen.getByText(/¥4,000 per student/)).toBeInTheDocument();
  });

  // Ceiling division, so a full class never collects less than the total asked.
  test("rounds the share up on an uneven split", () => {
    renderModal("group");
    fireEvent.change(screen.getByLabelText(p.teacherGroupSizeLabel), {
      target: { value: "3" },
    });
    fireEvent.change(priceField(p.teacherGroupTotalLabelTaxIncluded), {
      target: { value: "10000" },
    });

    expect(screen.getByText(/¥3,334 per student · ¥10,002 when full/)).toBeInTheDocument();
  });

  test("opens an existing class in the entry mode it was saved in", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherLessonAddModal
          open
          kind="individual"
          editing={{
            id: "offer-1",
            durationMin: 30,
            rateYen: 3300,
            groupTotalRateYen: null,
            ratePriceBasis: "TAX_EXCLUSIVE",
            isGroup: false,
            groupSize: null,
            classLevelId: "lvl-beginner",
            classTypeId: "type-conversation",
          }}
          classLevels={classLevels}
          classTypes={classTypes}
          locale="en"
          onClose={vi.fn()}
          onSaved={vi.fn()}
        />
      </NextIntlClientProvider>,
    );

    // Stored tax-included ¥3,300, shown back as the ¥3,000 fee that was typed.
    expect(screen.getByDisplayValue("3000")).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: p.teacherRateBasisOptionExclusive }),
    ).toBeChecked();
  });

  test("saves an edit against that class rather than creating another", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, offering: { id: "offer-1" } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TeacherLessonAddModal
          open
          kind="individual"
          editing={{
            id: "offer-1",
            durationMin: 30,
            rateYen: 3300,
            groupTotalRateYen: null,
            ratePriceBasis: "TAX_INCLUDED",
            isGroup: false,
            groupSize: null,
            classLevelId: "lvl-beginner",
            classTypeId: "type-conversation",
          }}
          classLevels={classLevels}
          classTypes={classTypes}
          locale="en"
          onClose={vi.fn()}
          onSaved={vi.fn()}
        />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByDisplayValue("3300"), { target: { value: "4400" } });
    fireEvent.click(screen.getByRole("button", { name: p.teacherEditClassConfirm }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as [string, { method: string; body: string }];
    expect(url).toBe("/api/teacher/lesson-offerings/offer-1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toMatchObject({ rateYen: 4400 });
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
          onSaved={vi.fn()}
        />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText(p.teacherAddClassNoTaxonomy)).toBeInTheDocument();
    expect(confirmButton()).toBeDisabled();
  });
});
