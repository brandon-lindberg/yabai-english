import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";

/** Learn hub lives at `/learn/study` (all levels + practice). */
export default async function LearnPage() {
  const locale = await getLocale();
  redirect({ href: "/learn/study", locale });
}
