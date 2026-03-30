import { Client, Databases, Storage } from "react-native-appwrite";

import { getAppwriteEnv } from "@/services/appwrite/env";

let client: Client | null = null;
let databases: Databases | null = null;
let storage: Storage | null = null;

export function getAppwriteClient(): Client {
  if (client) {
    return client;
  }

  const env = getAppwriteEnv();
  client = new Client().setEndpoint(env.endpoint).setProject(env.projectId);
  return client;
}

export function getAppwriteDatabases(): Databases {
  if (databases) {
    return databases;
  }

  databases = new Databases(getAppwriteClient());
  return databases;
}

export function getAppwriteStorage(): Storage {
  if (storage) {
    return storage;
  }

  storage = new Storage(getAppwriteClient());
  return storage;
}
