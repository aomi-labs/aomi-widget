import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { V3Footer } from "./components/footer";
import { V3Nav } from "./components/nav";
import styles from "./v3.module.css";

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

export default function V3Layout({ children }: { children: ReactNode }) {
  return (
    <div className={`${styles.root} ${geist.variable} ${geistMono.variable}`}>
      <V3Nav />
      {children}
      <V3Footer />
    </div>
  );
}
