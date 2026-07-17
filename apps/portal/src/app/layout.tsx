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
 * Shipping fonts: Geist Sans (UI) + Geist Mono (code / numerics).
 *
 * Optional future override: licensed ABC Diatype under
 * `public/assets/fonts/diatype/` — uncomment `@font-face` in globals.css and
 * prepend `"ABC Diatype"` to the sans stack (see PORTAL-VISUAL-THEME.md), or:
 *
 *   import localFont from "next/font/local";
 *   const diatype = localFont({
 *     src: [
 *       { path: "../../public/assets/fonts/diatype/ABCDiatype-Regular.woff2", weight: "400" },
 *       { path: "../../public/assets/fonts/diatype/ABCDiatype-Medium.woff2", weight: "500" },
 *       { path: "../../public/assets/fonts/diatype/ABCDiatype-Bold.woff2", weight: "700" },
 *     ],
 *     variable: "--font-diatype",
 *     display: "swap",
 *   });
 *   // then body / --font-geist-sans stack: "ABC Diatype", var(--font-diatype), …
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
          <SettingsInitializer>
            <div className="relative h-screen w-full overflow-hidden">{children}</div>
          </SettingsInitializer>
        </WalletProviders>
        <CookieConsent />
      </body>
    </html>
  );
}
