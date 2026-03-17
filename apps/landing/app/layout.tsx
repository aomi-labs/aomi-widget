import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { Provider } from "./provider";

export const metadata: Metadata = {
  title: "Aomi Labs",
  description:
    "Your agentic terminal for blockchain automation. Transform natural language into secure, multi-chain transactions.",
  icons: {
    icon: "/assets/images/bubble.svg",
  },
  metadataBase: new URL("https://aomi.dev"),
  openGraph: {
    title: "Aomi Labs",
    description:
      "Your agentic terminal for blockchain automation. Transform natural language into secure, multi-chain transactions.",
    url: "https://aomi.dev",
    siteName: "Aomi Labs",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Aomi Labs - AI-powered blockchain automation",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aomi Labs",
    description:
      "Your agentic terminal for blockchain automation. Transform natural language into secure, multi-chain transactions.",
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
