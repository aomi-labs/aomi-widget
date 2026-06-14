"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

const PrivyWidgetClient = dynamic(
  () => import("./privy-widget-client").then((m) => m.PrivyWidgetClient),
  { ssr: false },
);

export default function PrivyWidgetPage() {
  return (
    <Suspense fallback={null}>
      <PrivyWidgetClient />
    </Suspense>
  );
}
