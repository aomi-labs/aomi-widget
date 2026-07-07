import { notFound } from "next/navigation";

import { WidgetAuthE2EClient } from "./widget-auth-e2e-client";

export const dynamic = "force-dynamic";

export default function WidgetAuthE2EPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <WidgetAuthE2EClient />;
}
