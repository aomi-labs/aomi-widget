import { Suspense } from "react";

import { DeviceConnectClient } from "./device-connect-client";

export default function DeviceConnectPage() {
  return (
    <Suspense>
      <DeviceConnectClient />
    </Suspense>
  );
}
