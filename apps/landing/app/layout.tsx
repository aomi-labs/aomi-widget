import type { Metadata } from "next";
import "./globals.css";
import { Provider } from "./provider";

export const metadata: Metadata = {
  title: "Aomi Labs",
  description: "Docs, guides, and live previews for @aomi-labs/react.",
  icons: {
    icon: "/assets/images/bubble.svg",
  },
};

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
    </html>
  );
}
