import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { CookieConsent } from "@portal/components/cookie-consent";
import { GoogleAnalytics } from "@portal/components/google-analytics";
import { SettingsProvider } from "@portal/components/settings-provider";
import { WalletProviders } from "@portal/components/wallet-providers";
import {
  E2E_WALLET_COOKIE,
  verifyE2EWalletCookie,
} from "@portal/lib/e2e-wallet";

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
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
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
          <SettingsProvider>
            <div className="relative h-screen w-full overflow-hidden">{children}</div>
          </SettingsProvider>
        </WalletProviders>
        <CookieConsent />
      </body>
    </html>
  );
}
