import type { Metadata } from "next";
import { Geist, Geist_Mono, PT_Serif } from "next/font/google";
import { ColorThemeInitializer } from "@build/components/control-plane/color-theme-initializer";
import { COLOR_THEME_INIT_SCRIPT } from "@build/lib/color-theme";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const ptSerif = PT_Serif({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-pt-serif",
});

export const metadata: Metadata = {
  title: "Aomi Build",
  description: "Build, deploy, and operate Aomi apps",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full ${geistSans.variable} ${geistMono.variable} ${ptSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: COLOR_THEME_INIT_SCRIPT }} />
      </head>
      <body
        className="min-h-full font-sans antialiased"
        suppressHydrationWarning
      >
        <ColorThemeInitializer />
        {children}
      </body>
    </html>
  );
}
