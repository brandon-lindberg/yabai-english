import type { LearningLanguage } from "@/generated/prisma/enums";

export const APP_ICON_COOKIE = "studio_app_icon";
export const APP_ICON_COLORS = ["ink", "vermilion", "indigo", "forest"] as const;
export type AppIconColor = typeof APP_ICON_COLORS[number];

type AppIconFile = "icon-96.png" | "icon-192.png" | "icon-512.png" | "icon-maskable-512.png" | "apple-touch-icon.png";

export function defaultAppIcon(language?: LearningLanguage | null): AppIconColor {
  return language === "JAPANESE" ? "vermilion" : "ink";
}

export function resolveAppIcon(preference: string | undefined, fallback: AppIconColor): AppIconColor {
  return APP_ICON_COLORS.find(color => color === preference) ?? fallback;
}

export function appIconPath(color: AppIconColor, file: AppIconFile): string {
  return color === "ink" && file !== "icon-96.png" ? `/${file}` : `/app-icons/${color}/${file}`;
}
