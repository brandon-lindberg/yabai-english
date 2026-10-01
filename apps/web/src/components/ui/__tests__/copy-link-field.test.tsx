// @vitest-environment jsdom

import { act, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, test, vi } from "vitest";
import en from "../../../../messages/en.json";
import { CopyLinkField } from "@/components/ui/copy-link-field";

const URL = "https://www.example.test/book/teachers/teacher-1";

function renderField() {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <CopyLinkField value={URL} label="Booking link" />
    </NextIntlClientProvider>,
  );
}

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn(writeText) },
    configurable: true,
  });
  return navigator.clipboard.writeText as ReturnType<typeof vi.fn>;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("CopyLinkField", () => {
  test("shows the full link", () => {
    renderField();

    expect(screen.getByRole("textbox", { name: "Booking link" })).toHaveValue(URL);
  });

  test("copies the link and says so, then resets", async () => {
    vi.useFakeTimers();
    const writeText = stubClipboard(() => Promise.resolve());
    renderField();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: en.common.copyLink }));
    });

    expect(writeText).toHaveBeenCalledWith(URL);
    expect(screen.getByRole("button", { name: en.common.copied })).toBeTruthy();
    expect(screen.getByRole("status")).toHaveTextContent(en.common.copied);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("button", { name: en.common.copyLink })).toBeTruthy();
  });

  test("selects the link for a manual copy when the clipboard is refused", async () => {
    stubClipboard(() => Promise.reject(new Error("denied")));
    renderField();
    const input = screen.getByRole("textbox", { name: "Booking link" }) as HTMLInputElement;

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: en.common.copyLink }));
    });

    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(URL.length);
    expect(screen.getByRole("button", { name: en.common.copyLink })).toBeTruthy();
  });
});
