"use client";

import { SessionProvider } from "next-auth/react";
import { useLocale } from "next-intl";
import { useEffect } from "react";
import type { Session } from "next-auth";
import type { ReactNode } from "react";

export function AppProviders({
  children,
  session,
}: {
  children: ReactNode;
  session: Session | null;
}) {
  const locale = useLocale();
  // App Router retains the root layout during client navigation.
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
