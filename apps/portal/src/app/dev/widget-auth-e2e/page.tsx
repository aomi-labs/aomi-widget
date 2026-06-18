import { WidgetAuthE2EClient } from "./widget-auth-e2e-client";

export const dynamic = "force-dynamic";

export default function WidgetAuthE2EPage() {
  return (
    <WidgetAuthE2EClient
      privyAppId={
        process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? process.env.PRIVY_APP_ID ?? ""
      }
    />
  );
}
