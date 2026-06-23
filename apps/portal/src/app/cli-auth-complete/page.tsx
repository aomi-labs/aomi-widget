"use client";

import { CheckCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function CliAuthComplete() {
  const params = useSearchParams();
  const githubLogin = params.get("github_login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md text-center">
        <CheckCircle2 className="mx-auto mb-6 h-16 w-16 text-green-500" />
        <h1 className="mb-3 text-2xl font-semibold tracking-tight">
          Authentication successful
        </h1>
        {githubLogin && (
          <p className="mb-4 text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">@{githubLogin}</span>
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
