import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/inter";
import "./globals.css";

import { brand } from "@/config/brand";

export const metadata: Metadata = {
  metadataBase: new URL(brand.siteUrl),
  title: { default: `${brand.name} – ${brand.tagline}`, template: `%s · ${brand.name}` },
  description:
    "Design personalised T-shirts, hoodies, baby clothes and stickers online. Templates, your own artwork and print-ready quality, made to order.",
  applicationName: brand.name,
  openGraph: { siteName: brand.name, type: "website", locale: brand.locale.replace("-", "_") },
};

export const viewport: Viewport = {
  themeColor: "#FFFBF4",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={brand.contentLanguage} className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
