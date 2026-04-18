import { routing } from "@/i18n/routing";

/**
 * Builds a pathname (and optional query) as the browser would see it for `locale`
 * (`localePrefix: "as-needed"` — default locale has no `/ja` prefix).
 */
export function appPathForLocale(
  locale: string,
  pathname: string,
  searchParams?: URLSearchParams,
): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  const query =
    searchParams && [...searchParams.keys()].length > 0 ? `?${searchParams.toString()}` : "";
  return `${prefix}${path}${query}`;
}
