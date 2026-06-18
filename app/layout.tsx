// File: app/layout.tsx
import type { Metadata } from "next";
import { DM_Serif_Display, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

// Financial / settlement domain pairing (design-taste ronin §9):
// DM Serif Display = institutional gravitas (wordmark/headings),
// IBM Plex Mono = forensic on-chain ledger voice (body + every numeric).
const display = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RefiRail — one-click atomic refinance on Sui",
  description: "Move your loan to a cheaper rate in one atomic transaction.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
