// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { expect, test, vi } from "vitest";
import { AppProviders } from "../providers";

vi.mock("next-auth/react", () => ({ SessionProvider: ({ children }: { children: ReactNode }) => children }));

test("document language follows client-side locale navigation for assistive technology", () => {
  document.documentElement.lang = "ja";
  const tree = (locale: string) => <NextIntlClientProvider locale={locale} messages={{}}><AppProviders session={null}>Content</AppProviders></NextIntlClientProvider>;
  const { rerender } = render(tree("en"));
  expect(document.documentElement.lang).toBe("en");
  rerender(tree("ja"));
  expect(document.documentElement.lang).toBe("ja");
});
