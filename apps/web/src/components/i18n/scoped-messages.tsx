"use client";
import { NextIntlClientProvider, useLocale, useMessages, type AbstractIntlMessages } from "next-intl";
import { useMemo, type ReactNode } from "react";

/** Route payloads add their namespaces to the small, retained shell provider. */
export function ScopedMessages({ messages, children }: { messages: AbstractIntlMessages; children: ReactNode }) {
  const inherited = useMessages();
  const locale = useLocale();
  const combined = useMemo(() => ({ ...inherited, ...messages }), [inherited, messages]);
  return <NextIntlClientProvider locale={locale} messages={combined}>{children}</NextIntlClientProvider>;
}
