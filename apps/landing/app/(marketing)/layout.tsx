import type { ReactNode } from "react";
import { Geist, Geist_Mono, PT_Serif } from "next/font/google";
import { V3Footer } from "./components/footer";
import { V3Nav } from "./components/nav";
import styles from "./marketing.module.css";
import themeStyles from "./marketing-theme.module.css";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-v3-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-v3-mono",
});

const ptSerif = PT_Serif({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-v3-display",
});

export default function V3Layout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${styles.root} ${themeStyles.theme} ${geist.variable} ${geistMono.variable} ${ptSerif.variable}`}
    >
      <V3Nav />
      {children}
      <V3Footer />
    </div>
  );
}
