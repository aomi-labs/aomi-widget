"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { LoadingPanel } from "@build/features/launch/components/deployments/ui/state-panels";
import { platformHref, readPlatform } from "@build/features/launch/platform";
import { DEFAULT_DEPLOY_PLATFORM } from "@build/lib/deploy-platform";
import { getLastProjectId } from "@build/lib/last-project";

/**
 * Default landing: last project if known, otherwise Projects.
 * Overview stats live at /overview.
 */
export function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    const last = getLastProjectId();
    const href = last ? `/projects/${last}` : "/projects";
    router.replace(
      platformHref(href, readPlatform() ?? DEFAULT_DEPLOY_PLATFORM),
    );
  }, [router]);

  return <LoadingPanel label="Opening projects…" />;
}
