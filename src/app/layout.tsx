import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans, Newsreader } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

import { SyncProvider } from "@/components/sync-provider";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Theosis",
    template: "%s · Theosis",
  },
  description:
    "A mobile-first Orthodox Christian web app for Scripture, patristic commentary, daily readings, and library study.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${instrumentSans.variable} ${newsreader.variable} ${ibmPlexMono.variable}`}
      >
        {/* suppressHydrationWarning silences the cosmetic mismatch from browser
            extensions (Grammarly etc.) that inject data-* attributes onto <body>
            before React hydrates. The warning only applies to direct attributes
            on this element; children still receive normal hydration checks. */}
        <body
          className="min-h-dvh bg-background font-sans text-ink antialiased"
          suppressHydrationWarning
        >
          <SyncProvider />
          {children}
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
