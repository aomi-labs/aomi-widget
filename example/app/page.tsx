import { AomiFrame, WalletSystemMessenger } from "@aomi-labs/widget-lib";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-6">
      <AomiFrame height="720px" width="1200px">
        <WalletSystemMessenger />
      </AomiFrame>
    </main>
  );
}
