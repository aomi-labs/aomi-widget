import { spawnSync } from "node:child_process";

const result = spawnSync(
  "pnpm",
  [
    "exec",
    "vitest",
    "run",
    "--config",
    "../../vitest.config.ts",
    ...process.argv.slice(2),
  ],
  {
    stdio: "inherit",
  },
);

process.exit(result.status ?? 1);
