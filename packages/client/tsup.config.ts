import { defineConfig } from "tsup";

export default defineConfig([
  // Library build (ESM + CJS with type declarations)
  {
    entry: ["src/index.ts"],
    outDir: "dist",
    format: ["esm", "cjs"],
    dts: {
      compilerOptions: {
        incremental: false,
      },
    },
    splitting: false,
    sourcemap: true,
    clean: true,
    tsconfig: "tsconfig.json",
  },
  // CLI build (ESM only, no types, with shebang)
  {
    entry: ["src/cli.ts"],
    outDir: "dist",
    format: ["esm"],
    dts: false,
    splitting: false,
    sourcemap: false,
    clean: false,
    banner: { js: "#!/usr/bin/env node" },
    tsconfig: "tsconfig.json",
  },
]);
