'use client';

import dynamic from 'next/dynamic';

const SwitchNetwork = dynamic(() => import('@/components/switch-network'), {
  ssr: false,
  loading: () => (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white" />
    </main>
  ),
});

export default function NetworkPage() {
  return <SwitchNetwork />;
}
