export class CliExit extends Error {
  constructor(public code: number) {
    super();
  }
}

export function fatal(message: string): never {
  console.error(message);
  throw new CliExit(1);
}
