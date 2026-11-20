import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { APP_ICON_COOKIE, defaultAppIcon, resolveAppIcon } from "./app-icon";
import { getRequestLearningSite } from "./learning-site-request";

export const getRequestAppAppearance = cache(async () => {
  const [site, cookieStore] = await Promise.all([getRequestLearningSite(), cookies()]);
  const defaultIcon = defaultAppIcon(site?.learningLanguage);
  const icon = resolveAppIcon(cookieStore.get(APP_ICON_COOKIE)?.value, defaultIcon);
  return { site, defaultIcon, icon };
});
