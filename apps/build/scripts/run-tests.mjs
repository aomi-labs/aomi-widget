import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const passWithNoTests = args.includes("--passWithNoTests");
const forwardedArgs = args.filter((arg) => arg !== "--passWithNoTests");

const knownRunnableTestEntries = [
  "test/**/*.test.mjs",
  "test/**/*.test.js",
  "tests/**/*.test.mjs",
  "tests/**/*.test.js",
];

const hasConfiguredTests = knownRunnableTestEntries.some(
  (entry) => !entry.includes("*") && existsSync(entry),
);

if (!hasConfiguredTests) {
  if (passWithNoTests) {
    console.log("No frontend tests found; exiting successfully.");
    process.exit(0);
  }

  console.error("No frontend tests are configured.");
  process.exit(1);
}

const result = spawnSync("node", ["--test", ...forwardedArgs], {
  stdio: "inherit",
});

if (result.status === 1 && passWithNoTests) {
  console.log("No runnable Node test files found; exiting successfully.");
  process.exit(0);
}

process.exit(result.status ?? 1);
