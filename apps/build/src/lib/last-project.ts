const LAST_PROJECT_KEY = "aomi-build:last-project-id";

export function getLastProjectId(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_PROJECT_KEY);
    if (!raw) return null;
    const id = Number(raw);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function setLastProjectId(projectId: number) {
  if (typeof window === "undefined") return;
  if (!Number.isSafeInteger(projectId) || projectId <= 0) return;
  try {
    window.localStorage.setItem(LAST_PROJECT_KEY, String(projectId));
  } catch {
    // ignore quota / private mode
  }
}
