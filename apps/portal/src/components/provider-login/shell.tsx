import type { ReactNode } from "react";

export function PortalAuthShell({
  children,
  title,
}: {
  children?: ReactNode;
  title: string;
}) {
  return (
    <main className="bg-background text-foreground flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {children}
      </section>
    </main>
  );
}
