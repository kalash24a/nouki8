import type { Metadata, Viewport } from "next";
import "@fontsource-variable/newsreader/wght.css";
import "@fontsource/atkinson-hyperlegible/latin-400.css";
import "@fontsource/atkinson-hyperlegible/latin-700.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { themeScript } from "@/components/layout/ThemeToggle";

export const metadata: Metadata = {
  title: { default: "Talent Bridge · evidence employers can read", template: "%s · Talent Bridge" },
  description:
    "Evidence-based skill passports for international talent, and a blind, explainable shortlist for employers. MentorME Futura Remix, Track 1 prototype.",
  openGraph: { type: "website", locale: "en_AU", siteName: "Talent Bridge" },
};

export const viewport: Viewport = {
  themeColor: "#f7f1e6",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-sm focus:bg-primary focus:px-5 focus:py-3 focus:text-sm focus:text-on-primary"
        >
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <footer className="border-t">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-foreground-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>Talent Bridge · MentorME Futura Remix, Track 1 prototype. Every candidate and employer shown is fictional.</p>
            <p className="rec-sm">Tasks from ABS OSCA 2024 · 223231 Data Analyst</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
