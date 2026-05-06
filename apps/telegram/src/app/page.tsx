'use client';

import dynamic from 'next/dynamic';

// Dynamically import the connect component with no SSR
const ConnectWallet = dynamic(() => import('@/components/connect-wallet'), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-6 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-4"></div>
        <p className="max-w-[92vw] break-all px-4 text-center text-gray-400">Loading wallet...</p>
      </div>
    </main>
  ),
});

export default function Page() {
  return <ConnectWallet />;
}
