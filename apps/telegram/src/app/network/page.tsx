"use client";

import dynamic from "next/dynamic";

const SwitchNetwork = dynamic(() => import("@/components/switch-network"), {
  ssr: false,
  loading: () => (
    <main className="flex min-h-screen items-center justify-center bg-black">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-white" />
    </main>
  ),
});

export default function NetworkPage() {
  return <SwitchNetwork />;
}
