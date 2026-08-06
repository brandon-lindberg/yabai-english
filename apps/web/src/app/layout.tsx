import type { Metadata, Viewport } from "next";
import { Archivo, M_PLUS_1, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { THEME_INIT_SCRIPT } from "@/lib/theme-init-script";
import { SwRegister } from "@/components/sw-register";
import "./globals.css";

/** Latin + display voice. Variable, so every weight step is one file. */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Japanese. Chosen over Zen Kaku Gothic New because at weight 900 it holds the
 * same stroke density as Archivo 900 — Zen Kaku renders visibly lighter beside
 * it, which would undercut every display line in a mixed ja/en heading.
 * Not preloaded: the JP glyph set ships as many unicode-range slices and
 * preloading them all would cost more than it saves.
 */
const mplus1 = M_PLUS_1({
  variable: "--font-mplus1",
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

/** Tabular figures for schedule and invoice data only, never as decoration. */
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "English Studio",
  description: "Online English lessons and practice for Japanese learners.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "English Studio",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${archivo.variable} ${mplus1.variable} ${jetbrainsMono.variable} antialiased`}
      suppressHydrationWarning
    >
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
