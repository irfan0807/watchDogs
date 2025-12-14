import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import {
  storeUser,
  getStoredUser,
  storeKeys,
  getIdentityKey,
  getSignedPreKey,
  clearAllData,
  type StoredUser,
} from "@/lib/storage";
import { generateIdentityKeys, type KeyPair } from "@/lib/crypto";
import { emitUserOnline, disconnectSocket, getSocket } from "@/lib/socket";
import { apiRequest } from "@/lib/query-client";

interface AuthContextType {
  user: StoredUser | null;
  identityKey: KeyPair | null;
  signedPreKey: KeyPair | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  register: (username: string) => Promise<void>;
  login: (username: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [identityKey, setIdentityKey] = useState<KeyPair | null>(null);
  const [signedPreKey, setSignedPreKey] = useState<KeyPair | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const [storedUser, storedIdentityKey, storedSignedPreKey] = await Promise.all([
          getStoredUser(),
          getIdentityKey(),
          getSignedPreKey(),
        ]);

        if (storedUser && storedIdentityKey && storedSignedPreKey) {
          setUser(storedUser);
          setIdentityKey(storedIdentityKey);
          setSignedPreKey(storedSignedPreKey);
          emitUserOnline(storedUser.id);
        }
      } catch (error) {
        console.error("Failed to load user:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  const register = useCallback(async (username: string) => {
    const keys = generateIdentityKeys();
    
    const response = await apiRequest("POST", "/api/auth/register", {
      username,
      publicKey: keys.identityKey.publicKey,
      identityKey: keys.identityKey.publicKey,
      signedPreKey: keys.signedPreKey.publicKey,
    });

    const userData = await response.json();

    const storedUser: StoredUser = {
      id: userData.id,
      username: userData.username,
      publicKey: userData.publicKey,
      pairingCode: userData.pairingCode,
    };

    await Promise.all([
      storeUser(storedUser),
      storeKeys(keys.identityKey, keys.signedPreKey),
    ]);

    setUser(storedUser);
    setIdentityKey(keys.identityKey);
    setSignedPreKey(keys.signedPreKey);
    emitUserOnline(storedUser.id);
  }, []);

  const login = useCallback(async (username: string) => {
    const storedIdentityKey = await getIdentityKey();
    const storedSignedPreKey = await getSignedPreKey();
    
    if (!storedIdentityKey || !storedSignedPreKey) {
      throw new Error("No stored keys found. Please register first.");
    }

    const response = await apiRequest("POST", "/api/auth/login", { username });
    const userData = await response.json();

    const storedUser: StoredUser = {
      id: userData.id,
      username: userData.username,
      publicKey: userData.publicKey,
      pairingCode: userData.pairingCode,
    };

    await storeUser(storedUser);

    setUser(storedUser);
    setIdentityKey(storedIdentityKey);
    setSignedPreKey(storedSignedPreKey);
    emitUserOnline(storedUser.id);
  }, []);

  const logout = useCallback(async () => {
    disconnectSocket();
    await clearAllData();
    setUser(null);
    setIdentityKey(null);
    setSignedPreKey(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        identityKey,
        signedPreKey,
        isLoading,
        isAuthenticated: !!user,
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
