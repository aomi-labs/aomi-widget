import { notFound } from "next/navigation";

import { ThemeAuditClient } from "./theme-audit-client";

export const dynamic = "force-dynamic";

/**
 * Dev-only light/dark token audit. Renders the `aomi-*` ramp and every
 * redesigned surface twice — once light, once dark — from static fixtures, so
 * the whole design system can be compared without an authenticated account.
 */
export default function ThemeAuditPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <ThemeAuditClient />;
}
