export class CliExit extends Error {
  constructor(public code: number) {
    super();
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

  throw new CliExit(1);
}
