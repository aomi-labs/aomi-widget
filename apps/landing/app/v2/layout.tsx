import type { ReactNode } from "react";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { V2Nav } from "./sections/nav";
import { V2ThemeProvider } from "./theme-provider";

const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-v2-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-v2-mono",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-v2-display",
  axes: ["opsz"],
});

const THEME_BOOT = `(function(){try{var t=localStorage.getItem("aomi-v2-theme")||"system";var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("aomi-v2-dark",d);}catch(e){}})();`;

export default function V2Layout({ children }: { children: ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      <V2ThemeProvider
        className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable}`}
      >
        <V2Nav />
        {children}
      </V2ThemeProvider>
    </>
  );
}
