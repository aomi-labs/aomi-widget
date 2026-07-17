import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
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
 * UI sans prefers ABC Diatype (CSS stack in globals.css). Licensed Diatype
 * files are not in-repo, so Inter is loaded as the practical fallback.
 * Mono/numeric surfaces (`.aomi-numeric`, code) use Geist Mono.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}
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
