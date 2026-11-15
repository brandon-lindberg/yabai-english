import { expect, test, vi } from "vitest";
import en from "../../../messages/en.json";
import ja from "../../../messages/ja.json";
import { clientMessages, clientMessageScopes } from "@/i18n/client-messages";
const state = vi.hoisted(() => ({ locale: "en" }));
vi.mock("next-intl/server", () => ({ setRequestLocale: vi.fn(), getMessages: async () => state.locale === "ja" ? ja : en }));
vi.mock("@/auth", () => ({ auth: async () => null }));
vi.mock("@/lib/learning-site-request", () => ({ getRequestLearningSite: async () => null }));
vi.mock("@/lib/learning-sites", () => ({ configuredLearningSites: () => null }));
vi.mock("@/lib/learning-language-request", () => ({ getGuestLearningLanguage: async () => null }));
vi.mock("@/components/shell/site-header", () => ({ SiteHeader: () => null }));
vi.mock("@/components/shell/site-footer", () => ({ SiteFooter: () => null }));
vi.mock("@/components/app-chat-panel", () => ({ AppChatPanel: () => null }));
import LocaleLayout from "@/app/[locale]/layout";
import { FeatureMessages } from "@/components/i18n/feature-messages";

test.each(["en", "ja"])("the %s root serializes only shell messages; feature boundaries carry their own copy", async locale => {
  state.locale = locale;
  const messages = locale === "ja" ? ja : en;
  const root = await LocaleLayout({ params: Promise.resolve({ locale }), children: "page" });
  expect(root.props.messages).toEqual(clientMessages(messages, "shell"));
  expect(root.props.messages.admin).toBeUndefined();
  for (const scope of Object.keys(clientMessageScopes) as Array<keyof typeof clientMessageScopes>) {
    if (scope === "shell") continue;
    const feature = await FeatureMessages({ scope, children: "page" });
    expect(feature.props.messages).toEqual(clientMessages(messages, scope));
    expect(feature.props.children).toBe("page");
  }
});
