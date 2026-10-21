import { expect, type Page } from "@playwright/test";

type Labels = { menu: string; locale: string; switchToDark: string; switchToLight: string };

export async function openHeaderMenu(page: Page, labels: Labels) {
  const trigger = page.getByRole("button", { name: labels.menu, exact: true });
  if (await trigger.isVisible() && await trigger.locator("..").getAttribute("open") === null) await trigger.click();
}

export async function closeHeaderMenu(page: Page, labels: Labels) {
  const trigger = page.getByRole("button", { name: labels.menu, exact: true });
  if (await trigger.isVisible() && await trigger.locator("..").getAttribute("open") !== null) await trigger.click();
}

export async function setHeaderTheme(page: Page, labels: Labels, theme: "light" | "dark") {
  if (await page.locator("html").getAttribute("data-theme") !== theme) {
    await openHeaderMenu(page, labels);
    await page.getByRole("button", { name: theme === "dark" ? labels.switchToDark : labels.switchToLight, exact: true }).click();
  }
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  await closeHeaderMenu(page, labels);
}

export async function chooseInterfaceLocale(page: Page, labels: Labels, locale: "ja" | "en") {
  await openHeaderMenu(page, labels);
  await page.getByRole("button", { name: labels.locale, exact: true }).click();
  await page.getByRole("button", { name: locale === "ja" ? "日本語" : "English", exact: true }).click();
}
