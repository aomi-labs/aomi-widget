export function mapDeployHttpError(
  status: number,
  message: string,
): DeployCliError {
  if (status === 401 || status === 403) {
    return new DeployCliError("AUTH_FAILED", message);
  }
  return new DeployCliError("BACKEND_ERROR", message);
}

export class CliExit extends Error {
  constructor(public code: number) {
    super();
  }
}

export type DeployCliErrorCode =
  | "AUTH_FAILED"
  | "AUTH_TIMEOUT"
  | "BACKEND_ERROR"
  | "NOT_A_GIT_REPO"
  | "VALIDATION_ERROR"
  | "NETWORK_ERROR";

export class DeployCliError extends Error {
  readonly errorCode: DeployCliErrorCode;

  constructor(errorCode: DeployCliErrorCode, message: string) {
    super(message);
    this.name = "DeployCliError";
    this.errorCode = errorCode;
  }
}

export function fatal(message: string): never {
  const RED = "\x1b[31m";
  const DIM = "\x1b[2m";
  const RESET = "\x1b[0m";

  const lines = message.split("\n");
  const [headline, ...details] = lines;
  console.error(`${RED}❌ ${headline}${RESET}`);
  for (const detail of details) {
    if (!detail.trim()) {
      console.error("");
      continue;
    }
    console.error(`${DIM}${detail}${RESET}`);
  }

  if (process.env.AOMI_CLI_STRICT_EXIT === "1") {
    throw new CliExit(1);
  }
  process.exit(1);
}
