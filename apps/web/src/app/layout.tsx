import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { THEME_INIT_SCRIPT } from "@/lib/theme-init-script";
import { SwRegister } from "@/components/sw-register";
import "@fontsource-variable/archivo";
import "@fontsource-variable/m-plus-1";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { APP_NAME } from "@/lib/brand";
import { appIconPath } from "@/lib/app-icon";
import { getRequestAppAppearance } from "@/lib/app-icon-request";
import { getLocale } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const { site, icon } = await getRequestAppAppearance();
  return {
    title: APP_NAME,
    description: "Private online English and Japanese lessons with a teacher.",
    icons: {
      icon: icon === "ink" ? "/favicon.ico" : { url: appIconPath(icon, "icon-96.png"), sizes: "96x96", type: "image/png" },
      apple: [{ url: appIconPath(icon, "apple-touch-icon.png"), sizes: "180x180", type: "image/png" }],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: site?.brandName ?? APP_NAME,
    },
    other: { "mobile-web-app-capable": "yes" },
  };
}

/**
 * Mobile baseline ~iPhone 14 (390 CSS px); explicit viewport avoids odd zoom/layout in Safari.
 * Pinch-zoom stays enabled: locking it fails WCAG 1.4.4. The iOS focus-zoom this
 * originally guarded against is already handled by the 16px form-control rule below.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c0d" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, { site }] = await Promise.all([getLocale(), getRequestAppAppearance()]);
  return (
    <html
      lang={locale}
      className="antialiased"
      suppressHydrationWarning
    >
      <head>
        {/* Browsers omit cookies from manifest fetches unless the link opts in. */}
        <link rel="manifest" href={site ? "/manifest.webmanifest" : "/manifest.json"} crossOrigin="use-credentials" />
      </head>
      <body className="flex min-h-dvh flex-col overflow-x-clip bg-transparent text-foreground">
        <Script
          id="english-platform-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        {/* See the note in [locale]/layout.tsx: `mx-auto` on a flex child kills
            cross-axis stretch, so `main` needs its width stated. */}
        <div className="flex min-h-0 flex-1 flex-col overflow-x-clip [&>main]:w-full">
          {children}
        </div>
        <SwRegister />
      </body>
    </html>
  );
}
