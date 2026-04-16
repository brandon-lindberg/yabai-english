"use client";

import { AccountStatus } from "@prisma/client";
import { signOut, useSession } from "next-auth/react";
import { useEffect } from "react";

/**
 * If the account was hidden while a session still exists (e.g. JWT not yet refreshed),
 * force sign-out on the client.
 */
export function HiddenAccountGuard() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    if (session.user.accountStatus === AccountStatus.HIDDEN) {
      void signOut({ callbackUrl: "/" });
    }
  }, [session, status]);

  return null;
}
