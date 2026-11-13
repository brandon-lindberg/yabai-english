import type { MetadataRoute } from "next";
import baseManifest from "../../public/manifest.json";
import { getRequestLearningSite } from "@/lib/learning-site-request";
export const dynamic = "force-dynamic";
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const site = await getRequestLearningSite();
  return {
    ...baseManifest,
    ...(site ? { name: site.brandName, short_name: site.brandName } : {}),
    ...(site?.learningLanguage === "JAPANESE" ? { description: "Private online Japanese lessons and practice." } : {}),
  } as MetadataRoute.Manifest;
}
