import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { DASHBOARD_GOOGLE_SETTINGS_PATH } from "@/lib/dashboard-google-settings-path";

/**
 * Legacy URL: Google integrations now live under Settings.
 * Preserves query string (OAuth return, onboarding, etc.).
 */
export default async function DashboardIntegrationsRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocale();
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") qs.set(key, value);
    else if (Array.isArray(value) && value.length > 0) qs.set(key, value[0]!);
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  redirect({ href: `${DASHBOARD_GOOGLE_SETTINGS_PATH}${suffix}`, locale });
}
