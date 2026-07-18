const GREETING_PREFIX =
  /^(hey|hi|hello|yo|sup|hola|howdy)([,!.\s]+)/i;

/**
 * Build a sidebar title from the user prompt: drop greeting fluff,
 * take the first clause, truncate cleanly.
 */
export function deriveSessionTitle(prompt: string, maxLen = 48): string {
  let text = prompt.trim().replace(/\s+/g, " ");
  text = text.replace(GREETING_PREFIX, "").trim();
  const clause =
    text.split(/[.!?\n]/).find((part) => part.trim().length > 0)?.trim() ??
    text;
  const cleaned = clause || "New build";
  if (cleaned.length <= maxLen) return cleaned;
  const cut = cleaned.slice(0, maxLen - 1);
  const soft = cut.replace(/\s+\S*$/, "").trim();
  return `${soft.length >= 12 ? soft : cut.trim()}…`;
}

/** Ensure titles stay unique in Recent (hello, hello (2), …). */
export function uniqueSessionTitle(
  base: string,
  existingTitles: ReadonlyArray<string>,
): string {
  const normalized = base.trim() || "New build";
  const taken = new Set(
    existingTitles.map((t) => t.trim().toLowerCase()).filter(Boolean),
  );
  if (!taken.has(normalized.toLowerCase())) return normalized;

  let n = 2;
  while (taken.has(`${normalized.toLowerCase()} (${n})`)) n += 1;
  return `${normalized} (${n})`;
}

/** Remaster list display so already-persisted dupes don't collide. */
export function disambiguateSessionTitles<T extends { id: string; title: string }>(
  sessions: T[],
): T[] {
  const seen = new Map<string, number>();
  return sessions.map((session) => {
    const key = session.title.trim().toLowerCase() || "new build";
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count === 1) return session;
    return { ...session, title: `${session.title.trim() || "New build"} (${count})` };
  });
}
