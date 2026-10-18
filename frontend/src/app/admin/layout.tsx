import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/inter";
import "../globals.css";

import { brand } from "@/config/brand";

export const metadata: Metadata = {
  title: { default: `Back office · ${brand.name}`, template: `%s · Back office` },
  robots: { index: false, follow: false },
};

/** Separate root layout: the back office is staff-only and English-only for now. */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
