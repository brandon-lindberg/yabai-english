import { expect, type Page } from "@playwright/test";

type Labels = { menu: string; accountMenu?: string; locale: string; switchToDark: string; switchToLight: string };

function headerTrigger(page: Page, labels: Labels) {
  const guest = page.getByRole("button", { name: labels.menu, exact: true });
  return (labels.accountMenu ? guest.or(page.getByRole("button", { name: labels.accountMenu, exact: true })) : guest).filter({ visible: true }).first();
}

export async function openHeaderMenu(page: Page, labels: Labels) {
  const trigger = headerTrigger(page, labels);
  const locale = page.getByRole("button", { name: labels.locale, exact: true });
  await expect(trigger.or(locale).filter({ visible: true }).first()).toBeVisible();
  if (await locale.isVisible()) return;
  if (await trigger.locator("..").getAttribute("open") === null) await trigger.click();
  await expect(trigger.locator("..")).toHaveJSProperty("open", true);
}

export async function closeHeaderMenu(page: Page, labels: Labels) {
  const trigger = headerTrigger(page, labels);
  if (await trigger.isVisible() && await trigger.locator("..").getAttribute("open") !== null) await trigger.click();
}

export async function setHeaderTheme(page: Page, labels: Labels, theme: "light" | "dark") {
  if (await page.locator("html").getAttribute("data-theme") !== theme) {
    await openHeaderMenu(page, labels);
    const button = page.getByRole("button", { name: new RegExp(`^(${labels.switchToDark}|${labels.switchToLight})$`) });
    await expect(button).toBeVisible();
    if (await page.locator("html").getAttribute("data-theme") !== theme) await button.click();
  }
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  await closeHeaderMenu(page, labels);
}

export async function chooseInterfaceLocale(page: Page, labels: Labels, locale: "ja" | "en") {
  await openHeaderMenu(page, labels);
  await page.getByRole("button", { name: labels.locale, exact: true }).click();
  await page.getByRole("button", { name: locale === "ja" ? "日本語" : "English", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", locale);
}
