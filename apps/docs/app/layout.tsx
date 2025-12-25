import type { Metadata } from "next";
import "./globals.css";
import { Provider } from "./provider";

export const metadata: Metadata = {
  title: "Aomi Widget · Docs & Playground",
  description: "Docs, guides, and live previews for @aomi-labs/react.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="bg-background text-foreground">
      <body className="min-h-screen antialiased">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
