import "server-only";
import type { MetadataRoute } from "next";
import { APP_NAME } from "./brand";
import { appIconPath } from "./app-icon";
import { getRequestAppAppearance } from "./app-icon-request";

export async function getAppManifest(): Promise<MetadataRoute.Manifest> {
  const { site, icon } = await getRequestAppAppearance();
  const name = site?.brandName ?? APP_NAME;
  return {
    id: "/",
    name,
    short_name: name,
    description: site?.learningLanguage === "JAPANESE"
      ? "Private online Japanese lessons and practice."
      : "Online English lessons and practice for Japanese learners.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf8",
    theme_color: "#0c0c0d",
    orientation: "portrait-primary",
    icons: [
      { src: appIconPath(icon, "icon-192.png"), sizes: "192x192", type: "image/png" },
      { src: appIconPath(icon, "icon-512.png"), sizes: "512x512", type: "image/png" },
      { src: appIconPath(icon, "icon-maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

export async function appManifestResponse() {
  return Response.json(await getAppManifest(), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "private, no-store" },
  });
}
