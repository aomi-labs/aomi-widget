"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import {
  parseSettingsCategory,
  SETTINGS_QUERY_KEY,
} from "@portal/components/settings/settings-types";

/**
 * Deep-link compatibility: /settings → /?settings=<tab>
 * so the ChatGPT-style modal opens over chat instead of a full settings page.
 */
function SettingsRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    // GitHub / launch flows still belong on deployments.
    if (
      params.has("installation_id") ||
      params.get("launch") === "github" ||
      params.has("github_error")
    ) {
      router.replace(`/deployments?${params.toString()}`);
      return;
    }

    const category =
      parseSettingsCategory(params.get("tab")) ??
      parseSettingsCategory(params.get(SETTINGS_QUERY_KEY)) ??
      "general";

    const next = new URLSearchParams();
    next.set(SETTINGS_QUERY_KEY, category);
    router.replace(`/?${next.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="bg-background text-muted-foreground flex h-screen items-center justify-center text-sm">
      Opening settings…
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-background text-muted-foreground flex h-screen items-center justify-center text-sm">
          Opening settings…
        </div>
      }
    >
      <SettingsRedirectInner />
    </Suspense>
  );
}
