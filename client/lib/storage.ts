import AsyncStorage from "@react-native-async-storage/async-storage";
import type { KeyPair } from "@/lib/crypto";

const KEYS = {
  USER: "@watchdog:user",
  IDENTITY_KEY: "@watchdog:identityKey",
  SIGNED_PRE_KEY: "@watchdog:signedPreKey",
  ENCRYPTION_ENABLED: "@watchdog:encryptionEnabled",
  SELF_DESTRUCT_SECONDS: "@watchdog:selfDestructSeconds",
};

export interface StoredUser {
  id: string;
  username: string;
  publicKey: string;
  pairingCode: string;
}

export async function storeUser(user: StoredUser): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const data = await AsyncStorage.getItem(KEYS.USER);
  return data ? JSON.parse(data) : null;
}

export async function storeKeys(
  identityKey: KeyPair,
  signedPreKey: KeyPair
): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(KEYS.IDENTITY_KEY, JSON.stringify(identityKey)),
    AsyncStorage.setItem(KEYS.SIGNED_PRE_KEY, JSON.stringify(signedPreKey)),
  ]);
}

export async function getIdentityKey(): Promise<KeyPair | null> {
  const data = await AsyncStorage.getItem(KEYS.IDENTITY_KEY);
  return data ? JSON.parse(data) : null;
}

export async function getSignedPreKey(): Promise<KeyPair | null> {
  const data = await AsyncStorage.getItem(KEYS.SIGNED_PRE_KEY);
  return data ? JSON.parse(data) : null;
}

export async function setEncryptionEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.ENCRYPTION_ENABLED, JSON.stringify(enabled));
}

export async function getEncryptionEnabled(): Promise<boolean> {
  const data = await AsyncStorage.getItem(KEYS.ENCRYPTION_ENABLED);
  return data ? JSON.parse(data) : true;
}

export async function setSelfDestructSeconds(seconds: number | null): Promise<void> {
  await AsyncStorage.setItem(KEYS.SELF_DESTRUCT_SECONDS, JSON.stringify(seconds));
}

export async function getSelfDestructSeconds(): Promise<number | null> {
  const data = await AsyncStorage.getItem(KEYS.SELF_DESTRUCT_SECONDS);
  return data ? JSON.parse(data) : null;
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
