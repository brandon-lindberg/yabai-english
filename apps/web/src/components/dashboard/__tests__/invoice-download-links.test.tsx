// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { InvoiceDownloadLinks } from "../invoice-download-links";

describe("InvoiceDownloadLinks", () => {
  test("renders separate English and Japanese invoice download links", () => {
    render(<InvoiceDownloadLinks invoiceId="invoice-1" />);

    expect(screen.getByRole("link", { name: "Download invoice (English)" })).toHaveAttribute(
      "href",
      "/api/invoices/invoice-1/pdf?lang=en",
    );
    expect(screen.getByRole("link", { name: "Download invoice (Japanese)" })).toHaveAttribute(
      "href",
      "/api/invoices/invoice-1/pdf?lang=ja",
    );
  });
});
