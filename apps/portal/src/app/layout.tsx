import type { Metadata } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import "./globals.css";
import { CookieConsent } from "@portal/components/cookie-consent";
import { GoogleAnalytics } from "@portal/components/google-analytics";
import { SettingsProvider } from "@portal/components/settings-provider";
import { WalletProviders } from "@portal/components/wallet-providers";

const iaWriterMono = localFont({
  src: [
    {
      path: "../../public/assets/fonts/iAWriterMonoS-Regular.ttf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-ia-writer",
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
  const cookieString = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${value}`)
    .join("; ");

  return (
    <html lang="en">
      <body className={`${iaWriterMono.variable} font-sans antialiased`}>
        <GoogleAnalytics />
        <WalletProviders cookies={cookieString || null}>
          <SettingsProvider>
            <div className="relative h-screen w-full overflow-hidden">{children}</div>
          </SettingsProvider>
        </WalletProviders>
        <CookieConsent />
      </body>
    </html>
  );
}
