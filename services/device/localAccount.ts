import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";

const STORAGE_KEY = "faro.localDeviceAccount.v1";
const STORAGE_FILE_NAME = "faro-local-device-account.json";
const LOCAL_DEVICE_ACCOUNT_VERSION = 1;

type LocalStorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

type CryptoLike = {
  getRandomValues?: <T extends ArrayBufferView | null>(array: T) => T;
  randomUUID?: () => string;
};

export type LocalDeviceAccount = {
  createdAt: string;
  id: string;
  version: typeof LOCAL_DEVICE_ACCOUNT_VERSION;
};

type OwnableReport = {
  deviceAccountId?: string | null;
};

let localDeviceAccountPromise: Promise<LocalDeviceAccount> | null = null;

function getWebStorage(): LocalStorageLike | null {
  const globalScope = globalThis as typeof globalThis & {
    localStorage?: LocalStorageLike;
    window?: {
      localStorage?: LocalStorageLike;
    };
  };

  return globalScope.window?.localStorage ?? globalScope.localStorage ?? null;
}

function getCrypto(): CryptoLike | null {
  const globalScope = globalThis as typeof globalThis & {
    crypto?: CryptoLike;
  };

  return globalScope.crypto ?? null;
}

function createFallbackRandomId(): string {
  const randomParts = Array.from({ length: 4 }, () =>
    Math.random().toString(36).slice(2)
  ).join("");

  return `${Date.now().toString(36)}${randomParts}`;
}

function createUuidFromRandomBytes(): string | null {
  const cryptoScope = getCrypto();

  if (!cryptoScope?.getRandomValues) {
    return null;
  }

  const bytes = new Uint8Array(16);
  cryptoScope.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

function createLocalDeviceAccountId(): string {
  const cryptoScope = getCrypto();
  const randomId =
    cryptoScope?.randomUUID?.() ?? createUuidFromRandomBytes() ?? createFallbackRandomId();

  return `device_${randomId}`;
}

function isLocalDeviceAccount(value: unknown): value is LocalDeviceAccount {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const account = value as Partial<LocalDeviceAccount>;

  return (
    typeof account.id === "string" &&
    account.id.startsWith("device_") &&
    typeof account.createdAt === "string" &&
    account.version === LOCAL_DEVICE_ACCOUNT_VERSION
  );
}

function parseLocalDeviceAccount(rawValue: string | null): LocalDeviceAccount | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as unknown;

    return isLocalDeviceAccount(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

async function readStoredLocalDeviceAccount(): Promise<LocalDeviceAccount | null> {
  if (Platform.OS === "web") {
    return parseLocalDeviceAccount(getWebStorage()?.getItem(STORAGE_KEY) ?? null);
  }

  const storageFile = new File(Paths.document, STORAGE_FILE_NAME);

  if (!storageFile.exists) {
    return null;
  }

  return parseLocalDeviceAccount(await storageFile.text());
}

async function writeStoredLocalDeviceAccount(account: LocalDeviceAccount): Promise<void> {
  const serializedAccount = JSON.stringify(account);

  if (Platform.OS === "web") {
    getWebStorage()?.setItem(STORAGE_KEY, serializedAccount);
    return;
  }

  const storageFile = new File(Paths.document, STORAGE_FILE_NAME);

  if (!storageFile.exists) {
    storageFile.create({ intermediates: true });
  }

  storageFile.write(serializedAccount);
}

async function createAndStoreLocalDeviceAccount(): Promise<LocalDeviceAccount> {
  const account: LocalDeviceAccount = {
    id: createLocalDeviceAccountId(),
    createdAt: new Date().toISOString(),
    version: LOCAL_DEVICE_ACCOUNT_VERSION,
  };

  await writeStoredLocalDeviceAccount(account);

  return account;
}

export async function getLocalDeviceAccount(): Promise<LocalDeviceAccount> {
  if (!localDeviceAccountPromise) {
    localDeviceAccountPromise = (async () => {
      const storedAccount = await readStoredLocalDeviceAccount();

      return storedAccount ?? createAndStoreLocalDeviceAccount();
    })();
  }

  try {
    return await localDeviceAccountPromise;
  } catch (error) {
    localDeviceAccountPromise = null;
    throw error;
  }
}

export async function getLocalDeviceAccountId(): Promise<string> {
  const account = await getLocalDeviceAccount();

  return account.id;
}

export function isReportOwnedByLocalAccount(
  report: OwnableReport | null | undefined,
  localDeviceAccountId: string | null
): boolean {
  return Boolean(
    report &&
    localDeviceAccountId &&
    typeof report.deviceAccountId === "string" &&
    report.deviceAccountId === localDeviceAccountId
  );
}
