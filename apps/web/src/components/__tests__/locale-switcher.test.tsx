// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { LocaleSwitcher } from "@/components/locale-switcher";

/*
  next-intl's `usePathname` returns the path without its query string, so
  switching language used to navigate to the bare path — dropping every search
  param on the page. Filters, an onboarding step, anything held in the URL was
  silently discarded by a control that only claims to change the language.
*/

const { replaceMock, searchMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  searchMock: vi.fn(() => new URLSearchParams()),
}));

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/onboarding",
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchMock(),
}));

function renderSwitcher() {
  return render(
    <NextIntlClientProvider locale="en" messages={{ common: { locale: "Language" } }}>
      <LocaleSwitcher />
    </NextIntlClientProvider>,
  );
}

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    replaceMock.mockClear();
    searchMock.mockReturnValue(new URLSearchParams());
  });

  test("switches language", () => {
    renderSwitcher();

    fireEvent.click(screen.getByRole("button", { name: "日本語" }));

    expect(replaceMock).toHaveBeenCalledWith(
      { pathname: "/onboarding", query: {} },
      { locale: "ja" },
    );
  });

  test("keeps you where you were in the page", () => {
    // Changing the language is not a request to go back to the start of
    // whatever you were doing.
    searchMock.mockReturnValue(new URLSearchParams("step=3&onboardingStep=payments"));
    renderSwitcher();

    fireEvent.click(screen.getByRole("button", { name: "日本語" }));

    expect(replaceMock).toHaveBeenCalledWith(
      { pathname: "/onboarding", query: { step: "3", onboardingStep: "payments" } },
      { locale: "ja" },
    );
  });
});
