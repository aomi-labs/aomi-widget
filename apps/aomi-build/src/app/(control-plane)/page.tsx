import Link from "next/link";

const availableLinks = [
  {
    label: "Projects",
    href: "/projects",
    description: "Browse backend-wired app sources and project settings.",
  },
  {
    label: "Deployments",
    href: "/operate/deployments",
    description: "Review deployments globally, or select a project for actions.",
  },
];

const upcomingAreas = [
  "Build",
  "Transactions",
  "Observability",
  "Usage",
  "Agents",
  "Logs",
  "Integrations",
  "Settings",
];

export default function OverviewPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-6">
      <div className="flex flex-col gap-2">
        <p className="text-[12px] uppercase tracking-wide text-dim">Overview</p>
        <h1 className="text-2xl font-semibold text-foreground">Aomi Build</h1>
        <p className="max-w-2xl text-sm text-subtle">
          Operator workspace for project deployments. The live surfaces are kept
          narrow while the remaining control-plane tabs are staged in the shell.
        </p>
      </div>

      <section className="grid gap-3 md:grid-cols-2">
        {availableLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border border-border bg-surface-1 p-4 transition hover:border-border-hover hover:bg-accent-hover"
          >
            <div className="text-sm font-medium text-foreground">{item.label}</div>
            <p className="mt-2 text-[13px] text-dim">{item.description}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-lg border border-border bg-surface-1 p-4">
        <div className="text-sm font-medium text-foreground">Coming next</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {upcomingAreas.map((area) => (
            <span
              key={area}
              className="rounded-md border border-border bg-surface-2 px-2.5 py-1 text-[12px] text-dim"
            >
              {area}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
