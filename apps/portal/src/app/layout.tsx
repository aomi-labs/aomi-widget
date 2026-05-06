import type { Metadata } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import "./globals.css";
import { WalletProviders } from "@/components/wallet-providers";
import { SettingsProvider } from "@/components/settings-provider";
import { GoogleAnalytics } from "@/components/google-analytics";
import { CookieConsent } from "@/components/cookie-consent";

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
