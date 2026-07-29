import type { ReactNode } from "react";

export function PrivyDelegationShell({
  children,
  status,
}: {
  children?: ReactNode;
  status: string;
}) {
  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">
          Connect your Privy wallet
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">{status}</p>
        {children}
      </section>
    </main>
  );
}
