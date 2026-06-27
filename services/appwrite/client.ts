import { Client, Databases, Storage as AppwriteStorage } from "react-native-appwrite";
import { Platform } from "react-native";

import { getAppwriteEnv } from "@/services/appwrite/env";

let client: Client | null = null;
let databases: Databases | null = null;
let storage: AppwriteStorage | null = null;

type LocalStorageFallback = {
  readonly length: number;
  clear: () => void;
  getItem: (key: string) => string | null;
  key: (index: number) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
};

function ensureLocalStorageFallback(): void {
  const globalScope = globalThis as typeof globalThis & {
    window?: {
      localStorage?: LocalStorageFallback;
    };
    localStorage?: LocalStorageFallback;
  };

  const windowScope = globalScope.window ?? globalScope;

  if (windowScope.localStorage) {
    return;
  }

  const storageMap = new Map<string, string>();
  const localStorageFallback = {
    getItem: (key: string) => storageMap.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storageMap.set(key, String(value));
    },
    removeItem: (key: string) => {
      storageMap.delete(key);
    },
    clear: () => {
      storageMap.clear();
    },
    key: (index: number) => Array.from(storageMap.keys())[index] ?? null,
    get length() {
      return storageMap.size;
    },
  } satisfies LocalStorageFallback;

  windowScope.localStorage = localStorageFallback;
  globalScope.localStorage = localStorageFallback;
}

export function getAppwriteClient(): Client {
  if (client) {
    return client;
  }

  const env = getAppwriteEnv();
  ensureLocalStorageFallback();
  client = new Client().setEndpoint(env.endpoint).setProject(env.projectId).setPlatform(Platform.OS);
  return client;
}

export function getAppwriteDatabases(): Databases {
  if (databases) {
    return databases;
  }

  databases = new Databases(getAppwriteClient());
  return databases;
}

export function getAppwriteStorage(): AppwriteStorage {
  if (storage) {
    return storage;
  }

  storage = new AppwriteStorage(getAppwriteClient());
  return storage;
}
