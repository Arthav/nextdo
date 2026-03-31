"use client";

export const APP_STORAGE_KEYS = {
  todos: "todos",
  taskHistory: "taskHistory",
  tourShown: "tourShown",
  projectManagerProjects: "projectManager:projects",
  projectManagerTemplates: "projectManager:templates",
  projectManagerHistory: "projectManager:history",
} as const;

export const ALL_APP_STORAGE_KEYS = Object.values(APP_STORAGE_KEYS);

const DB_NAME = "nextdo-app-storage";
const STORE_NAME = "keyvalue";
const DB_VERSION = 1;

type ExportPayload = {
  version: number;
  exportedAt: string;
  data: Record<string, unknown>;
};

let dbPromise: Promise<IDBDatabase> | null = null;
let migrationPromise: Promise<void> | null = null;

const openDatabase = () => {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
};

const runTransaction = async <T>(
  mode: IDBTransactionMode,
  handler: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void
) => {
  const database = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);

    transaction.onerror = () => reject(transaction.error);
    handler(store, resolve, reject);
  });
};

const parseLegacyValue = (raw: string) => {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
};

export const migrateLegacyLocalStorageData = async () => {
  if (migrationPromise) {
    return migrationPromise;
  }

  migrationPromise = (async () => {
    for (const key of ALL_APP_STORAGE_KEYS) {
      const currentValue = await getStoredValue(key);

      if (typeof currentValue !== "undefined") {
        continue;
      }

      const legacyValue = window.localStorage.getItem(key);

      if (legacyValue === null) {
        continue;
      }

      await setStoredValue(key, parseLegacyValue(legacyValue));
    }
  })();

  return migrationPromise;
};

export const getStoredValue = async <T>(key: string): Promise<T | undefined> =>
  runTransaction<T | undefined>("readonly", (store, resolve, reject) => {
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });

export const setStoredValue = async (key: string, value: unknown) =>
  runTransaction<void>("readwrite", (store, resolve, reject) => {
    const request = store.put(value, key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

export const getManyStoredValues = async (keys: string[]) =>
  Object.fromEntries(
    await Promise.all(
      keys.map(async (key) => [key, await getStoredValue(key)] as const)
    )
  );

export const exportStoredData = async () => {
  await migrateLegacyLocalStorageData();
  const data = await getManyStoredValues(ALL_APP_STORAGE_KEYS);

  const payload: ExportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };

  return JSON.stringify(payload, null, 2);
};

export const importStoredData = async (jsonText: string) => {
  const payload = JSON.parse(jsonText) as Partial<ExportPayload>;

  if (!payload || typeof payload !== "object" || !payload.data) {
    throw new Error("Invalid backup file.");
  }

  const entries = Object.entries(payload.data).filter(([key]) =>
    ALL_APP_STORAGE_KEYS.includes(key as (typeof ALL_APP_STORAGE_KEYS)[number])
  );

  for (const [key, value] of entries) {
    await setStoredValue(key, value);
  }
};

export const requestPersistentStorage = async () => {
  if (!("storage" in navigator) || !navigator.storage.persist) {
    return false;
  }

  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
};
