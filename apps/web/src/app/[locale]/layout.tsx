import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { routing } from "@/i18n/routing";
import { auth } from "@/auth";
import { AppProviders } from "@/components/providers";
import { HiddenAccountGuard } from "@/components/hidden-account-guard";
import { IdleLogoutGuard } from "@/components/idle-logout-guard";
import { SiteHeader } from "@/components/shell/site-header";
import { SiteFooter } from "@/components/shell/site-footer";
import { ChatPanel } from "@/components/chat-panel";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const session = await auth();

  return (
    <NextIntlClientProvider messages={messages}>
      <AppProviders session={session}>
        <div className="flex min-h-0 flex-1 flex-col overflow-x-clip">
          <HiddenAccountGuard />
          <IdleLogoutGuard />
          <SiteHeader />
          {/*
            `[&>main]:w-full` is load-bearing. Pages centre themselves with
            `mx-auto max-w-*`, and auto margins on a flex item's cross axis
            switch off `align-items: stretch` — so every `main` in the app was
            sized by its *content* instead of its container, capped by its
            max-width. A page whose widest element was narrow rendered narrow:
            the month calendar shrank `main` from 1024px to 822px, and the page
            visibly changed width when you switched from week to month.
          */}
          <div className="flex min-h-0 flex-1 flex-col overflow-x-clip [&>main]:w-full">
            {children}
          </div>
          <SiteFooter />
          <ChatPanel />
        </div>
      </AppProviders>
    </NextIntlClientProvider>
  );
}
