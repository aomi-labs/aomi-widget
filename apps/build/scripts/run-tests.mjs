import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));

const result = spawnSync(
  "pnpm",
  [
    "exec",
    "vitest",
    "run",
    "apps/build/src",
    "--config",
    "vitest.config.ts",
    ...process.argv.slice(2),
  ],
  {
    cwd: repositoryRoot,
    stdio: "inherit",
  },
);

process.exit(result.status ?? 1);
