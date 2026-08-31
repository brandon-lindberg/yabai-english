// @vitest-environment jsdom

import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { CreditNoteDownloadLinks } from "../invoice-download-links";

describe("CreditNoteDownloadLinks", () => {
  test("links to the credit note in both languages", () => {
    render(
      <CreditNoteDownloadLinks
        refundId="refund-1"
        englishLabel="Download credit note (English)"
        japaneseLabel="Download credit note (Japanese)"
      />,
    );

    expect(
      screen.getByRole("link", { name: "Download credit note (English)" }),
    ).toHaveAttribute("href", "/api/refunds/refund-1/credit-note?lang=en");
    expect(
      screen.getByRole("link", { name: "Download credit note (Japanese)" }),
    ).toHaveAttribute("href", "/api/refunds/refund-1/credit-note?lang=ja");
  });
});
