// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { NextIntlClientProvider, useMessages, useTranslations } from "next-intl";
import en from "../../../messages/en.json";
import ja from "../../../messages/ja.json";
import { clientMessages } from "@/i18n/client-messages";
import { ScopedMessages } from "@/components/i18n/scoped-messages";

afterEach(cleanup);
test.each([en, ja])("sends only the shell and relevant learning messages", messages => {
  const shell = clientMessages(messages, "shell");
  expect(shell).toEqual({ common: messages.common, auth: messages.auth, learningJourney: messages.learningJourney, chat: messages.chat });
  const english = clientMessages(messages, "placement");
  const japanese = clientMessages(messages, "japanesePlacement");
  expect(english.placement).toEqual(messages.placement);
  expect(japanese.japanesePlacement).toEqual(messages.japanesePlacement);
  expect(japanese.dashboard).toEqual({ quickReview: messages.dashboard.quickReview, previous: messages.dashboard.previous, next: messages.dashboard.next });
  for (const scope of [shell, english, japanese, clientMessages(messages, "learn")]) {
    expect(scope.admin).toBeUndefined();
    expect(scope.org).toBeUndefined();
    expect(scope.legal).toBeUndefined();
  }
  expect(JSON.stringify({ ...shell, ...japanese }).length).toBeLessThan(JSON.stringify(messages).length / 3);
  expect(messages.dashboard.settingsPage).toBeDefined(); // Selection cannot modify the source dictionary.
});

function Probe({ japanese = false }: { japanese?: boolean }) {
  const common = useTranslations("common"), page = useTranslations(japanese ? "japanesePlacement" : "placement");
  const messages = useMessages();
  return <><span>{common("signIn")}</span><h1>{page("title")}</h1><output>{Object.keys(messages).sort().join(",")}</output></>;
}
test("route providers preserve shell copy and replace prior-route messages during navigation and locale changes", () => {
  const view = render(<NextIntlClientProvider locale="en" messages={clientMessages(en, "shell")}>
    <ScopedMessages messages={clientMessages(en, "placement")}><Probe /></ScopedMessages>
  </NextIntlClientProvider>);
  expect(screen.getByRole("heading")).toHaveTextContent(en.placement.title);
  expect(screen.getByText(en.common.signIn)).toBeVisible();
  view.rerender(<NextIntlClientProvider locale="ja" messages={clientMessages(ja, "shell")}>
    <ScopedMessages messages={clientMessages(ja, "japanesePlacement")}><Probe japanese /></ScopedMessages>
  </NextIntlClientProvider>);
  expect(screen.getByRole("heading")).toHaveTextContent(ja.japanesePlacement.title);
  expect(screen.getByText(ja.common.signIn)).toBeVisible();
  expect(screen.getByRole("status")).not.toHaveTextContent("admin");
});
