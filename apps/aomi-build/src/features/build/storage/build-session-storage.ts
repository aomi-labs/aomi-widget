import {
  seedBuildSessions,
  type BuildSession,
} from "@build/features/build/contracts";

const STORAGE_KEY = "aomi-build-sessions-v1";
const sessionListeners = new Set<() => void>();

function emitBuildSessionsChange() {
  sessionListeners.forEach((listener) => listener());
}

export function subscribeBuildSessions(onStoreChange: () => void) {
  sessionListeners.add(onStoreChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onStoreChange();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    sessionListeners.delete(onStoreChange);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export const emptySessions: BuildSession[] = [];

// getSnapshot must return a stable reference between store changes,
// so cache the parsed sessions keyed on the raw localStorage string.
let sessionsCache: { raw: string | null; value: BuildSession[] } | null = null;

export function loadPersistedSessions(): BuildSession[] {
  if (typeof window === "undefined") return emptySessions;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (sessionsCache && sessionsCache.raw === raw) return sessionsCache.value;

  let value = emptySessions;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as BuildSession[];
      value = Array.isArray(parsed) ? parsed : emptySessions;
    } catch {
      value = emptySessions;
    }
  }
  sessionsCache = { raw, value };
  return value;
}

export function savePersistedSession(session: BuildSession) {
  const existing = loadPersistedSessions().filter((s) => s.id !== session.id);
  const next = [session, ...existing].slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  emitBuildSessionsChange();
}

export function mergeSessions(persisted: BuildSession[]): BuildSession[] {
  const persistedIds = new Set(persisted.map((s) => s.id));
  const seeded = seedBuildSessions.filter((s) => !persistedIds.has(s.id));
  return [...persisted, ...seeded];
}

export function findSessionById(
  id: string,
  persisted: BuildSession[],
): BuildSession | undefined {
  return (
    persisted.find((s) => s.id === id) ??
    seedBuildSessions.find((s) => s.id === id)
  );
}
