import { runMain } from "citty";
import { root } from "./root";
import { CliExit } from "./errors";

function isPnpmExecWrapper(): boolean {
  const npmCommand = process.env.npm_command ?? "";
  const userAgent = process.env.npm_config_user_agent ?? "";
  return npmCommand === "exec" && userAgent.includes("pnpm/");
}

export async function runCli(_argv: string[] = process.argv): Promise<void> {
  const strictExit = process.env.AOMI_CLI_STRICT_EXIT === "1";

  try {
    await runMain(root);
  } catch (err) {
    if (err instanceof CliExit) {
      if (!strictExit && isPnpmExecWrapper()) {
        return;
      }
      process.exit(err.code);
      return;
    }
    const RED = "\x1b[31m";
    const RESET = "\x1b[0m";
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${RED}❌ ${message}${RESET}`);
    process.exit(1);
  }
}
