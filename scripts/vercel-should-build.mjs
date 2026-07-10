import { spawnSync } from "node:child_process";

const project = process.argv[2];
const projectPaths = {
  "aomi-build": [
    "apps/aomi-build",
    "packages/account",
    "packages/client",
    "packages/deploy",
    "packages/react",
    "packages/widget-lib",
  ],
  base: [
    "apps/base",
    "packages/account",
    "packages/client",
    "packages/react",
    "packages/widget-lib",
  ],
  landing: [
    "apps/landing",
    "apps/shadcn-registry",
    "packages/account",
    "packages/react",
    "packages/widget-lib",
  ],
  portal: [
    "apps/portal",
    "packages/account",
    "packages/client",
    "packages/deploy",
    "packages/react",
    "packages/widget-lib",
  ],
  telegram: ["apps/telegram", "packages/client"],
};
const globalPaths = [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "tsconfig.lib.json",
  "next.config.ts",
  "postcss.config.mjs",
];

if (!projectPaths[project]) {
  console.error(`Unknown Vercel project: ${project}`);
  process.exit(1);
}

const previous = process.env.VERCEL_GIT_PREVIOUS_SHA;
const current = process.env.VERCEL_GIT_COMMIT_SHA ?? "HEAD";
if (!previous) {
  console.log("No previous Vercel commit; building.");
  process.exit(1);
}

const result = spawnSync(
  "git",
  ["diff", "--quiet", previous, current, "--", ...globalPaths, ...projectPaths[project]],
  { stdio: "inherit" },
);

if (result.error || result.status === null) {
  console.error("Could not compare Vercel Git commits; building.");
  process.exit(1);
}

if (result.status === 0) {
  console.log(`No ${project} inputs changed; skipping build.`);
  process.exit(0);
}

process.exit(1);
