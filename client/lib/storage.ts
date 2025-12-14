import { Platform } from "react-native";
import type { KeyPair } from "@/lib/crypto";

const KEYS = {
  USER: "@watchdog:user",
  IDENTITY_KEY: "@watchdog:identityKey",
  SIGNED_PRE_KEY: "@watchdog:signedPreKey",
  ENCRYPTION_ENABLED: "@watchdog:encryptionEnabled",
  SELF_DESTRUCT_SECONDS: "@watchdog:selfDestructSeconds",
};

const storage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.removeItem(key);
  },
  multiRemove: async (keys: string[]): Promise<void> => {
    if (Platform.OS === "web") {
      keys.forEach((key) => localStorage.removeItem(key));
      return;
    }
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    await AsyncStorage.multiRemove(keys);
  },
};

export interface StoredUser {
  id: string;
  username: string;
  publicKey: string;
  pairingCode: string;
}

export async function storeUser(user: StoredUser): Promise<void> {
  await storage.setItem(KEYS.USER, JSON.stringify(user));
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const data = await storage.getItem(KEYS.USER);
  return data ? JSON.parse(data) : null;
}

export async function storeKeys(
  identityKey: KeyPair,
  signedPreKey: KeyPair
): Promise<void> {
  await Promise.all([
    storage.setItem(KEYS.IDENTITY_KEY, JSON.stringify(identityKey)),
    storage.setItem(KEYS.SIGNED_PRE_KEY, JSON.stringify(signedPreKey)),
  ]);
}

export async function getIdentityKey(): Promise<KeyPair | null> {
  const data = await storage.getItem(KEYS.IDENTITY_KEY);
  return data ? JSON.parse(data) : null;
}

export async function getSignedPreKey(): Promise<KeyPair | null> {
  const data = await storage.getItem(KEYS.SIGNED_PRE_KEY);
  return data ? JSON.parse(data) : null;
}

export async function setEncryptionEnabled(enabled: boolean): Promise<void> {
  await storage.setItem(KEYS.ENCRYPTION_ENABLED, JSON.stringify(enabled));
}

export async function getEncryptionEnabled(): Promise<boolean> {
  const data = await storage.getItem(KEYS.ENCRYPTION_ENABLED);
  return data ? JSON.parse(data) : true;
}

export async function setSelfDestructSeconds(seconds: number | null): Promise<void> {
  await storage.setItem(KEYS.SELF_DESTRUCT_SECONDS, JSON.stringify(seconds));
}

export async function getSelfDestructSeconds(): Promise<number | null> {
  const data = await storage.getItem(KEYS.SELF_DESTRUCT_SECONDS);
  return data ? JSON.parse(data) : null;
}

export async function clearAllData(): Promise<void> {
  await storage.multiRemove(Object.values(KEYS));
}
