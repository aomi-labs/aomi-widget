// Example Operate payloads assembled from the per-app fixtures, in the exact
// wire shape the BFF returns. Two consumers:
//
//   - dev-operate-preview: serves these for every tab (pure design harness).
//   - bff/operate/routes.ts: serves them ONLY where the manager has no data
//     yet (billing statement, 24h trend metrics), so the new designs are
//     visible in production before backend parity lands. Real backend data
//     always wins per field; payloads filled this way carry `example: true`
//     and the page shows an "Example data" badge.
//
// Delete the BFF fallback branches (and nothing else) once the manager ships
// `/user/sources/:id/statement` and the 24h trend fields on observability.

import { FIXTURES } from ".";

/** Placeholder source for accounts that have no app sources yet. */
export const EXAMPLE_SOURCE = { id: 0, repositoryLink: "example/apps" };

export const EXAMPLE_RANGE = { fromDate: "2026-07-01", toDate: "2026-07-15" };

// Charge subjects carry negative net (money the builder owes); everything
// else is earned revenue. Mirrors the manager's assemble_statement.
const CHARGE_SUBJECTS = new Set(["model", "hosting"]);

/**
 * Statement in the BFF wire shape, folded from the per-app fixtures the same
 * way the manager's assemble_statement does: charge subjects feed
 * service_charges from |net|; earning subjects feed gross/fees; net sums
 * everything.
 */
export function exampleStatement(source: object) {
  const summary = { grossRevenue: 0, platformFees: 0, serviceCharges: 0, net: 0 };
  for (const fixture of FIXTURES) {
    for (const row of fixture.statement.entries) {
      summary.net += row.net;
      if (CHARGE_SUBJECTS.has(row.subject)) {
        summary.serviceCharges += Math.abs(row.net);
      } else {
        summary.grossRevenue += row.gross;
        summary.platformFees += row.platformFee;
      }
    }
  }
  const withApp = <T,>(rows: T[], fixture: (typeof FIXTURES)[number]) =>
    rows.map((row) => ({
      ...row,
      application: fixture.meta.name,
      applicationId: fixture.meta.applicationId,
      source,
    }));
  return {
    range: EXAMPLE_RANGE,
    summary,
    revenue: FIXTURES.flatMap((f) => withApp(f.statement.revenue, f)),
    charges: FIXTURES.flatMap((f) => withApp(f.statement.charges, f)),
    entries: FIXTURES.flatMap((f) => withApp(f.statement.entries, f)).sort(
      (a, b) =>
        b.day.localeCompare(a.day) || a.application.localeCompare(b.application),
    ),
  };
}

/** Full metrics block (live tiles + 24h trend) for the fixture at `index`. */
export function exampleAppMetrics(index: number): Record<string, any> {
  const fixture = FIXTURES[index % FIXTURES.length];
  return {
    provider: "grafana_prometheus",
    windowSeconds: 900,
    available: true,
    trendWindowSeconds: 86_400,
    ...fixture.card,
  };
}

/** Complete example app cards, for accounts with no live apps at all. */
export function exampleAppCards(source: object) {
  return FIXTURES.map((fixture, index) => ({
    applicationId: fixture.meta.applicationId,
    application: fixture.meta.name,
    active: fixture.meta.status !== "inactive",
    loaded: fixture.meta.status === "healthy",
    releaseTag: fixture.meta.releaseTag,
    sdkVersion: fixture.meta.sdkVersion,
    status: fixture.meta.status,
    source,
    metrics: exampleAppMetrics(index),
  }));
}

/**
 * Fill example trend metrics onto live app cards that lack them. Any metric
 * the backend actually reported wins; only null/missing fields are filled.
 * `filled` reports whether any card needed example data.
 */
export function withExampleTrends<T extends { metrics?: Record<string, any> | null }>(
  apps: T[],
): { apps: T[]; filled: boolean } {
  let filled = false;
  const out = apps.map((app, index) => {
    const metrics = app.metrics ?? {};
    const hasTrend =
      metrics.chats24h != null ||
      metrics.toolCalls24h != null ||
      metrics.transactions24h != null;
    if (hasTrend) return app;
    filled = true;
    const real = Object.fromEntries(
      Object.entries(metrics).filter(([, value]) => value != null),
    );
    return { ...app, metrics: { ...exampleAppMetrics(index), ...real } };
  });
  return { apps: out, filled };
}
