export function getHttpStatus(error: unknown): number | undefined {
  const status = (error as { status?: unknown })?.status;
  if (typeof status === "number") return status;

  const message = error instanceof Error ? error.message : String(error);
  const match = /\bHTTP\s+(\d{3})\b/i.exec(message);
  return match ? Number(match[1]) : undefined;
}
