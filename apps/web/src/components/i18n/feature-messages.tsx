import "server-only";
import type { ReactNode } from "react";
import { getMessages } from "next-intl/server";
import { clientMessages, type ClientMessageScope } from "@/i18n/client-messages";
import { ScopedMessages } from "./scoped-messages";

/** Only selected messages cross the server/client boundary. */
export async function FeatureMessages({ scope, children }: { scope: Exclude<ClientMessageScope, "shell">; children: ReactNode }) {
  return <ScopedMessages messages={clientMessages(await getMessages(), scope)}>{children}</ScopedMessages>;
}
