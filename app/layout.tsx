// File: app/layout.tsx
import type { Metadata } from "next";
import { Instrument_Serif, Hanken_Grotesk, Spline_Sans_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

// "Editorial Settlement" type system:
// Instrument Serif = display voice (wordmark, headlines, the big health figure).
// Hanken Grotesk   = body + UI.
// Spline Sans Mono = on-chain artifacts only (hashes, addresses, prices, signed deltas).
const serif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});
const sans = Hanken_Grotesk({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const mono = Spline_Sans_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RefiRail · atomic refinance and deleverage on Sui",
  description:
    "Move your Sui lending position to a cheaper rate, or pay down debt to lift your health factor. One atomic transaction, zero upfront capital, reverts if it would leave you worse off.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
