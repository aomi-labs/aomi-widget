import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { CookieConsent } from "@portal/components/analytics/cookie-consent";
import { GoogleAnalytics } from "@portal/components/analytics/google-analytics";
import { SettingsInitializer } from "@portal/components/providers/settings-initializer";
import { WalletProviders } from "@portal/components/providers/wallet-providers";
import {
  E2E_WALLET_COOKIE,
  verifyE2EWalletCookie,
} from "@portal/server/e2e-wallet";

/**
 * Branch experiment (`feat/chat-portal-visual-theme`):
 * Geist Mono is the primary UI font (chrome, labels, rail, empty state).
 * Geist Sans stays loaded as secondary for long prose via `font-sans` / `.aomi-prose`.
 *
 * See specs/PORTAL-VISUAL-THEME.md.
 */
const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Aomi Labs",
  description: "A research and engineering group focused on building agentic software for blockchain automation",
  icons: {
    icon: "/assets/images/a.svg",
    shortcut: "/assets/images/a.svg",
    apple: "/assets/images/a.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const e2eWallet = verifyE2EWalletCookie(
    cookieStore.get(E2E_WALLET_COOKIE)?.value,
  );

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-mono antialiased`}
      >
        <GoogleAnalytics />
        <WalletProviders
          e2eWallet={
            e2eWallet
              ? {
                  address: e2eWallet.address,
                  chainId: e2eWallet.chainId,
                }
              : null
          }
        >
          <SettingsInitializer>
            <div className="relative h-screen w-full overflow-hidden">{children}</div>
          </SettingsInitializer>
        </WalletProviders>
        <CookieConsent />
      </body>
    </html>
  );
}
