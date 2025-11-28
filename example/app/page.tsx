"use client";
import { AomiFrame } from "@aomi-labs/widget-lib";
import { WalletFooter } from "@/components/wallet";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-6">
      <AomiFrame
        height="720px"
        width="1200px"
        walletFooter={(props) => <WalletFooter {...props} />}
      />
    </main>
  );
}
