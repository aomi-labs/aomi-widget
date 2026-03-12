import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import { Provider } from "./provider";

export const metadata: Metadata = {
  title: "Aomi Labs",
  description: "Docs, guides, and live previews for @aomi-labs/react.",
  icons: {
    icon: "/assets/images/bubble.svg",
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
