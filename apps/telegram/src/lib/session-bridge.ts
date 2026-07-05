import {
  WALLET_STORAGE_KEY_PREFIXES,
  WC_IDB_NAME,
  WC_IDB_STORE,
} from "./constants";

// ---------------------------------------------------------------------------
// IDB helpers
// ---------------------------------------------------------------------------

async function readIdb(): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(WC_IDB_NAME);
      req.onerror = () => resolve({});
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(WC_IDB_STORE)) {
          db.close();
          return resolve({});
        }
        const tx = db.transaction(WC_IDB_STORE, "readonly");
        const store = tx.objectStore(WC_IDB_STORE);
        const all = store.getAll();
        const keys = store.getAllKeys();
        tx.oncomplete = () => {
          const entries: Record<string, unknown> = {};
          for (let i = 0; i < keys.result.length; i++) {
            entries[String(keys.result[i])] = all.result[i];
          }
          db.close();
          resolve(entries);
        };
        tx.onerror = () => {
          db.close();
          resolve({});
        };
      };
      req.onupgradeneeded = () => {
        // DB didn't exist yet — nothing to read
        req.result.close();
        resolve({});
      };
    } catch {
      resolve({});
    }
  });
}

async function writeIdb(entries: Record<string, unknown>): Promise<void> {
  const keys = Object.keys(entries);
  if (keys.length === 0) return;

  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(WC_IDB_NAME);
      req.onerror = () => resolve();
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(WC_IDB_STORE)) {
          db.createObjectStore(WC_IDB_STORE);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(WC_IDB_STORE)) {
          // Need to create the store — bump version
          db.close();
          const req2 = indexedDB.open(WC_IDB_NAME, db.version + 1);
          req2.onupgradeneeded = () => {
            req2.result.createObjectStore(WC_IDB_STORE);
          };
          req2.onsuccess = () => {
            putEntries(req2.result, entries, keys);
            resolve();
          };
          req2.onerror = () => resolve();
          return;
        }
        putEntries(db, entries, keys);
        resolve();
      };
    } catch {
      resolve();
    }
  });
}

function putEntries(
  db: IDBDatabase,
  entries: Record<string, unknown>,
  keys: string[],
) {
  try {
    const tx = db.transaction(WC_IDB_STORE, "readwrite");
    const store = tx.objectStore(WC_IDB_STORE);
    for (const k of keys) {
      store.put(entries[k], k);
    }
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  } catch {
    db.close();
  }
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function readLsWhitelisted(): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (WALLET_STORAGE_KEY_PREFIXES.some((p) => key.startsWith(p))) {
      result[key] = localStorage.getItem(key)!;
    }
  }
  return result;
}

function writeLs(entries: Record<string, string>) {
  for (const [k, v] of Object.entries(entries)) {
    localStorage.setItem(k, v);
  }
}

export function clearLsWhitelisted() {
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && WALLET_STORAGE_KEY_PREFIXES.some((p) => key.startsWith(p))) {
      toRemove.push(key);
    }
  }
  for (const key of toRemove) {
    localStorage.removeItem(key);
  }
}

export function clearSessionWhitelisted() {
  const toRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && WALLET_STORAGE_KEY_PREFIXES.some((p) => key.startsWith(p))) {
      toRemove.push(key);
    }
  }
  for (const key of toRemove) {
    sessionStorage.removeItem(key);
  }
}

export async function clearIdb(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(WC_IDB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function persist(userId: string): Promise<void> {
  try {
    const ls = readLsWhitelisted();
    const idb = await readIdb();
    await fetch("/api/sessions/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, ls, idb }),
    });
  } catch {
    // Server unreachable — no-op, next open will do a fresh connect
  }
}

export async function restore(userId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/sessions/record?user_id=${encodeURIComponent(userId)}`,
    );
    const data = await res.json();
    if (!data.found) {
      // Server has no session (e.g. server restarted) — let wallet providers try to
      // reconnect from whatever is already in the browser's IDB/localStorage.
      return false;
    }
    writeLs(data.ls ?? {});
    await writeIdb(data.idb ?? {});
    return true;
  } catch {
    return false;
  }
}

export async function clear(userId: string): Promise<void> {
  try {
    await fetch("/api/sessions/record", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
  } catch {
    // ignore
  }
  // Also wipe browser state on explicit disconnect
  clearLsWhitelisted();
  clearSessionWhitelisted();
  await clearIdb();
}
