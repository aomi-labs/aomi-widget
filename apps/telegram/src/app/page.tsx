"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Dynamically import the connect component with no SSR
const ConnectWallet = dynamic(() => import("@/components/connect-wallet"), {
  ssr: false,
  loading: () => (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-900 to-black p-6 text-white">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-white"></div>
        <p className="max-w-[92vw] break-all px-4 text-center text-gray-400">
          Loading wallet...
        </p>
      </div>
    </main>
  ),
});

const ConnectPrivyWallet = dynamic(
  () => import("@/components/connect-privy-wallet"),
  {
    ssr: false,
    loading: () => (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-900 to-black p-6 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-white"></div>
          <p className="max-w-[92vw] break-all px-4 text-center text-gray-400">
            Loading wallet...
          </p>
        </div>
      </main>
    ),
  },
);

export default function Page() {
  const [provider, setProvider] = useState<string | null>(null);

  useEffect(() => {
    setProvider(new URLSearchParams(window.location.search).get("provider"));
  }, []);

  if (provider === "privy") {
    return <ConnectPrivyWallet />;
  }

  return <ConnectWallet />;
}
