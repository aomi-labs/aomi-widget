"use client";

import { Icons, PortalIcon } from "@portal/components/icons";
import { useSearchParams } from "next/navigation";

export default function DeviceAuthComplete() {
  const params = useSearchParams();
  const githubLogin = params.get("github_login");

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md text-center">
        <PortalIcon icon={Icons.CheckCircle2} size={16} className="mx-auto mb-6 h-16 w-16 text-green-500" />
        <h1 className="mb-3 text-2xl font-medium tracking-tight">
          Authentication successful
        </h1>
        {githubLogin && (
          <p className="text-muted-foreground mb-4">
            Signed in as{" "}
            <span className="text-foreground font-medium">@{githubLogin}</span>
          </p>
        )}
        <p className="text-muted-foreground">
          You can now return to your terminal — the CLI will automatically
          detect the completed authorization and continue.
        </p>
      </div>
    </div>
  );
}
