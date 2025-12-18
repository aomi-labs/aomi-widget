import type { Metadata } from "next";
import "./globals.css";
import ContextProvider from "../src/components/wallet-providers";

export const metadata: Metadata = {
  title: "Example App - @aomi-labs/widget-lib",
  description: "Example app consuming @aomi-labs/widget-lib",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ContextProvider cookies={null}>{children}</ContextProvider>
      </body>
    </html>
  );
}
