// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import en from "../../../messages/en.json";
import { ThemeToggle } from "../theme-toggle";

beforeEach(() => {
  const saved = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => saved.set(key, value) });
  document.documentElement.dataset.theme = "light";
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const showToggle = () => render(<NextIntlClientProvider locale="en" messages={en}><ThemeToggle /></NextIntlClientProvider>);

test("one labelled icon changes the theme and restores the saved choice", async () => {
  showToggle();
  fireEvent.click(await screen.findByRole("button", { name: "Switch to dark theme" }));
  expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  expect(localStorage.getItem("english-platform-theme")).toBe("dark");
  cleanup();
  showToggle();
  fireEvent.click(await screen.findByRole("button", { name: "Switch to light theme" }));
  expect(document.documentElement).toHaveAttribute("data-theme", "light");
});

test("desktop and mobile controls stay in sync when the viewport changes", async () => {
  showToggle();
  showToggle();
  fireEvent.click((await screen.findAllByRole("button", { name: "Switch to dark theme" }))[0]);
  expect(screen.getAllByRole("button", { name: "Switch to light theme" })).toHaveLength(2);
});
