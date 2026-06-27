"use client";

import dynamic from "next/dynamic";

const SignTransaction = dynamic(() => import("@/components/sign-transaction"), {
  ssr: false,
  loading: () => (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-900 to-black p-6 text-white">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-white"></div>
        <p className="max-w-[92vw] break-all px-4 text-center text-gray-400">
          Loading transaction...
        </p>
      </div>
    </main>
  ),
});

export default function SignPage() {
  return <SignTransaction />;
}
