import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { Provider } from "./provider";

export const metadata: Metadata = {
  title: "Blockchain AI Infrastructure for Web3 Builders | Aomi",
  description:
    "Blockchain AI infrastructure for Web3 builders. Embed AI features with our React SDK. Simulation-first, human-in-the-loop, multi-chain. Ship in minutes.",
  icons: {
    icon: "/assets/images/bubble.svg",
  },
  metadataBase: new URL("https://aomi.dev"),
  openGraph: {
    title: "Blockchain AI Infrastructure for Web3 Builders | Aomi",
    description:
      "Blockchain AI infrastructure for Web3 builders. Embed AI features with our React SDK. Simulation-first, human-in-the-loop, multi-chain.",
    url: "https://aomi.dev",
    siteName: "Aomi",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Aomi - Blockchain AI Infrastructure for Web3 Builders",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blockchain AI Infrastructure for Web3 Builders | Aomi",
    description:
      "Blockchain AI infrastructure for Web3 builders. Embed AI features with our React SDK. Simulation-first, human-in-the-loop, multi-chain.",
    images: ["/api/og"],
    creator: "@aomi_labs",
  },
};

// TODO: Replace with actual GA Measurement ID from Shy
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-XXXXXXXXXX";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="bg-background text-foreground"
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased">
        <Provider>{children}</Provider>
      </body>
      {GA_MEASUREMENT_ID && GA_MEASUREMENT_ID !== "G-XXXXXXXXXX" && (
        <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />
      )}
    </html>
  );
}
