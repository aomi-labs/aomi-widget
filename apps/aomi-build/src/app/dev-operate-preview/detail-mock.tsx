"use client";

// TEMPORARY design mock: the ideal per-app drill-down dashboard, with every
// data source we planned wired in (Prometheus trends, Postgres ledger,
// registry lifecycle). Fixture data only. Delete with the harness page.

import { ArrowLeft, ExternalLink } from "lucide-react";

const HOURS = [
  "00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11",
  "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23",
];
const CHATS = [0, 1, 0, 2, 3, 1, 0, 0, 2, 4, 5, 3, 2, 1, 0, 1, 3, 4, 6, 3, 2, 1, 2, 1];
const TOOLS = [0, 2, 1, 5, 8, 3, 1, 0, 6, 11, 14, 9, 5, 3, 1, 2, 8, 12, 17, 9, 6, 3, 3, 1];
const P95_S = [0, 4.1, 0, 5.2, 6.0, 3.8, 0, 0, 5.5, 7.2, 8.4, 6.9, 5.1, 4.2, 0, 3.9, 6.1, 7.8, 8.1, 6.4, 5.0, 4.4, 4.9, 3.7];
const CREDITS_7D = [1.8, 2.1, 2.9, 2.4, 2.45, 3.1, 3.42];
const DAYS_7D = ["Jul 9", "Jul 10", "Jul 11", "Jul 12", "Jul 13", "Jul 14", "Jul 15"];

const FUNNEL = [
  { label: "Chats", value: 47 },
  { label: "Tool calls", value: 130 },
  { label: "Tx proposed", value: 14 },
  { label: "Tx submitted", value: 12 },
  { label: "Tx confirmed", value: 11 },
];

const TOOL_ROWS = [
  { tool: "get_price", calls: 52, errors: 1, errorRate: "1.9%", p95: "320 ms", last: "—" },
  { tool: "swap_quote", calls: 34, errors: 4, errorRate: "11.8%", p95: "2100 ms", last: "slippage exceeded · 42m ago", bad: true },
  { tool: "portfolio_overview", calls: 18, errors: 0, errorRate: "0%", p95: "890 ms", last: "—" },
  { tool: "set_goal", calls: 14, errors: 0, errorRate: "0%", p95: "150 ms", last: "—" },
  { tool: "rebalance_plan", calls: 12, errors: 1, errorRate: "8.3%", p95: "1400 ms", last: "insufficient balance · 3h ago" },
];

const TX_ROWS = [
  { id: "tx-1", time: "17:48", desc: "Swap 0.25 ETH → USDC on Uniswap v3", chain: "Base", status: "confirmed", gas: "0.00041 ETH", fee: "0.20 bps" },
  { id: "tx-2", time: "16:53", desc: "Approve USDC for Aave v3 pool", chain: "Ethereum", status: "confirmed", gas: "0.00088 ETH", fee: "—" },
  { id: "tx-3", time: "15:23", desc: "Bridge 0.05 ETH to Arbitrum", chain: "Base", status: "reverted", gas: "0.00019 ETH", fee: "—", bad: true },
  { id: "tx-4", time: "14:02", desc: "Add 1.2 ETH liquidity to ETH/USDC", chain: "Ethereum", status: "pending", gas: "—", fee: "—" },
];

const RELEASES = [
  { tag: "r1dac12ad71", when: "Jul 15, 17:45", current: true, note: "SDK 3.0.2" },
  { tag: "r0998aa77c2", when: "Jul 12, 09:12", current: false, note: "SDK 3.0.2" },
  { tag: "r08812c9f10", when: "Jul 8, 21:30", current: false, note: "SDK 3.0.1" },
];

const LOG_ROWS = [
  { when: "17:45", type: "deployment", text: "Activated release apps-141779906-r1dac12ad71-goal-digger" },
  { when: "16:48", type: "tool_error", text: "swap_quote failed: slippage exceeded (12 retries in 1h)" },
  { when: "14:10", type: "app_evicted", text: "Evicted after 45m idle (memory pressure policy)" },
  { when: "12:33", type: "app_loaded", text: "Cold start in 1250 ms (dylib 4.5 MB, SDK 3.0.2)" },
];

function BarChart({
  series,
  labels,
  height = 96,
}: {
  series: Array<{ values: number[]; className: string }>;
  labels: string[];
  height?: number;
}) {
  const max = Math.max(...series.flatMap((s) => s.values), 1);
  const n = labels.length;
  const band = 100 / n;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} aria-hidden>
      {series.map((s, si) => {
        const w = (band * 0.7) / series.length;
        return s.values.map((v, i) => {
          const h = (v / max) * (height - 8);
          return (
            <rect
              key={`${si}-${i}`}
              x={i * band + band * 0.15 + si * w}
              y={height - h}
              width={w}
              height={h}
              className={s.className}
              rx={0.4}
            />
          );
        });
      })}
    </svg>
  );
}

function LineChart({ values, height = 96 }: { values: number[]; height?: number }) {
  const max = Math.max(...values, 1);
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${height - 6 - (v / max) * (height - 14)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="text-dim w-full" style={{ height }} aria-hidden>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "bad" | "warn" }) {
  return (
    <div className="border-border bg-surface rounded-md border px-3 py-2.5">
      <div className="text-dim text-xs">{label}</div>
      <div
        className={`text-lg font-semibold ${tone === "bad" ? "text-red-500" : tone === "warn" ? "text-amber-500" : "text-foreground"}`}
      >
        {value}
      </div>
      {sub ? <div className="text-dim text-xs">{sub}</div> : null}
    </div>
  );
}

function Panel({ title, right, children }: { title: string; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border-border bg-surface rounded-md border">
      <div className="border-border flex items-center justify-between border-b px-3 py-2">
        <span className="text-dim text-xs font-medium uppercase">{title}</span>
        {right}
      </div>
      <div className="px-3 py-3">{children}</div>
    </div>
  );
}

const STATUS_CHIP: Record<string, string> = {
  confirmed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  reverted: "bg-red-500/10 text-red-500 border-red-500/30",
};

export function AppDetailMock({
  onBack,
  onOpenTrace,
  onOpenTx,
}: {
  onBack: () => void;
  onOpenTrace: (tool: string) => void;
  onOpenTx: (txId: string) => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack} className="border-border bg-surface hover:bg-accent-hover rounded-md border p-2">
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">goal-digger</h1>
              <span className="flex items-center gap-1.5 text-xs">
                <span className="size-2 rounded-full bg-emerald-500" /> healthy
              </span>
            </div>
            <div className="text-dim text-xs">
              apps-141779906-r1dac12ad71-goal-digger · SDK 3.0.2 · aomi-labs/apps
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="border-border bg-surface flex rounded-md border text-xs">
            {["1h", "24h", "7d", "30d"].map((r) => (
              <button
                key={r}
                type="button"
                className={`px-3 py-1.5 ${r === "24h" ? "bg-accent-hover text-foreground rounded-md" : "text-dim"}`}
              >
                {r}
              </button>
            ))}
          </div>
          <a href="https://grafana.example.com/d/app" target="_blank" rel="noreferrer" className="border-border bg-surface hover:bg-accent-hover flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs">
            Grafana <ExternalLink className="size-3" />
          </a>
        </div>
      </div>

      {/* Funnel */}
      <Panel title="Conversion funnel · 24h">
        <div className="flex flex-wrap items-stretch gap-0">
          {FUNNEL.map((stage, i) => {
            const prev = i > 0 ? FUNNEL[i - 1].value : null;
            const conv = prev ? Math.round((stage.value / prev) * 100) : null;
            return (
              <div key={stage.label} className="flex items-center">
                {i > 0 ? (
                  <div className="text-dim px-3 text-center text-xs">
                    <div>→</div>
                    <div>{conv}%</div>
                  </div>
                ) : null}
                <div className="border-border bg-surface-subtle min-w-28 rounded-md border px-4 py-3 text-center">
                  <div className="text-2xl font-semibold">{stage.value}</div>
                  <div className="text-dim text-xs">{stage.label}</div>
                </div>
              </div>
            );
          })}
          <div className="text-dim ml-auto flex flex-col justify-center pl-4 text-xs">
            <div>
              1 reverted · <span className="text-red-500">tx failure 8.3%</span>
            </div>
            <div>chat→tx conversion 23%</div>
          </div>
        </div>
      </Panel>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
        <Tile label="Chat errors" value="2.5%" />
        <Tile label="Tool errors" value="12.0%" tone="bad" sub="swap_quote drives it" />
        <Tile label="Tx failures" value="8.3%" tone="warn" />
        <Tile label="P95 turn" value="8.4 s" />
        <Tile label="Inflight" value="2" />
        <Tile label="Active users" value="9" sub="24h" />
        <Tile label="Credits" value="3.42" sub="0.073 / turn" />
        <Tile label="Fee accrued" value="0.0021 ETH" sub="20 bps on gas" />
      </div>

      {/* Charts */}
      <div className="grid gap-2 lg:grid-cols-3">
        <Panel
          title="Activity by hour"
          right={
            <span className="text-dim flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-emerald-500/80" /> chats</span>
              <span className="flex items-center gap-1"><span className="bg-foreground/30 size-2 rounded-sm" /> tool calls</span>
            </span>
          }
        >
          <BarChart
            labels={HOURS}
            series={[
              { values: TOOLS, className: "fill-foreground/25" },
              { values: CHATS, className: "fill-emerald-500/80" },
            ]}
          />
          <div className="text-dim mt-1 flex justify-between text-[10px]">
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
          </div>
        </Panel>
        <Panel title="P95 turn latency" right={<span className="text-dim text-xs">seconds</span>}>
          <LineChart values={P95_S} />
          <div className="text-dim mt-1 flex justify-between text-[10px]">
            <span>00:00</span><span>peak 8.4 s</span><span>23:00</span>
          </div>
        </Panel>
        <Panel title="Credits per day" right={<span className="text-dim text-xs">7d · from usage ledger</span>}>
          <BarChart labels={DAYS_7D} series={[{ values: CREDITS_7D, className: "fill-amber-500/70" }]} />
          <div className="text-dim mt-1 flex justify-between text-[10px]">
            <span>{DAYS_7D[0]}</span><span>{DAYS_7D[6]} · 3.42</span>
          </div>
        </Panel>
      </div>

      {/* Tools table → click a row to open its trace in Logs */}
      <Panel title="Tools · 24h" right={<span className="text-dim text-xs">130 calls · 6 errors · click a row to open its trace in Logs</span>}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-dim text-left text-xs uppercase">
              <tr>
                <th className="py-1.5 pr-3">Tool</th>
                <th className="py-1.5 pr-3">Calls</th>
                <th className="py-1.5 pr-3">Errors</th>
                <th className="py-1.5 pr-3">Error rate</th>
                <th className="py-1.5 pr-3">P95</th>
                <th className="py-1.5">Last error</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {TOOL_ROWS.map((row) => (
                <tr
                  key={row.tool}
                  onClick={() => onOpenTrace(row.tool)}
                  className="hover:bg-surface-subtle cursor-pointer"
                >
                  <td className="py-2 pr-3 font-mono text-xs">{row.tool}</td>
                  <td className="py-2 pr-3">{row.calls}</td>
                  <td className="py-2 pr-3">{row.errors}</td>
                  <td className={`py-2 pr-3 font-medium ${row.bad ? "text-red-500" : ""}`}>{row.errorRate}</td>
                  <td className="py-2 pr-3">{row.p95}</td>
                  <td className="text-dim py-2 text-xs">{row.last}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>


      {/* Transactions + right column */}
      <div className="grid gap-2 lg:grid-cols-[1fr_340px]">
        <Panel title="Recent transactions" right={<span className="text-dim text-xs">gas 24h 0.0042 ETH · click a row to open it in Transactions</span>}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-dim text-left text-xs uppercase">
                <tr>
                  <th className="py-1.5 pr-3">Time</th>
                  <th className="py-1.5 pr-3">Action</th>
                  <th className="py-1.5 pr-3">Chain</th>
                  <th className="py-1.5 pr-3">Status</th>
                  <th className="py-1.5 pr-3">Gas</th>
                  <th className="py-1.5 pr-3">Fee</th>
                  <th className="py-1.5">Explorer</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {TX_ROWS.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onOpenTx(row.id)}
                    className="hover:bg-surface-subtle cursor-pointer"
                  >
                    <td className="text-dim py-2 pr-3 text-xs">{row.time}</td>
                    <td className="max-w-64 truncate py-2 pr-3">{row.desc}</td>
                    <td className="py-2 pr-3">{row.chain}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_CHIP[row.status] ?? ""}`}>{row.status}</span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">{row.gas}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{row.fee}</td>
                    <td className="py-2">
                      {row.status !== "pending" ? (
                        <a href="https://basescan.org" target="_blank" rel="noreferrer" className="text-dim hover:text-foreground">
                          <ExternalLink className="size-3.5" />
                        </a>
                      ) : (
                        <span className="text-dim text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="flex flex-col gap-2">
          <Panel title="Lifecycle">
            <dl className="space-y-1.5 text-sm">
              {[
                ["Cold start", "1250 ms"],
                ["Dylib size", "4.5 MB"],
                ["Loads · 24h", "3"],
                ["Evictions · 24h", "2"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-dim">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title="Releases">
            <div className="space-y-2 text-sm">
              {RELEASES.map((release) => (
                <div key={release.tag} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-mono text-xs">{release.tag}</span>
                  <span className="text-dim text-xs">{release.when}</span>
                  {release.current ? (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-500">current</span>
                  ) : (
                    <span className="text-dim text-xs">{release.note}</span>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Logs */}
      <Panel title="Recent events" right={<span className="text-dim text-xs">app-filtered</span>}>
        <div className="space-y-2">
          {LOG_ROWS.map((entry) => (
            <div key={`${entry.when}-${entry.type}`} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{entry.text}</span>
              <span className="text-dim shrink-0 text-xs">{entry.type} · {entry.when}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
