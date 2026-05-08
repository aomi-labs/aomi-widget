import { AomiApp } from "./aomi-app";

export const dynamic = "force-dynamic";

const walletAppName = process.env.NEXT_PUBLIC_WALLET_APP_NAME?.trim() || "Aomi";

export default function HomePage() {
  return (
    <AomiApp
      paymasterServiceUrl="/api/paymaster"
      walletAppName={walletAppName}
    />
  );
}
