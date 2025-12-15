import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";

export interface KeyPair {
  publicKey: string;
  secretKey: string;
}

export interface EncryptedMessage {
  encryptedContent: string;
  nonce: string;
}

export function generateKeyPair(): KeyPair {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: naclUtil.encodeBase64(keyPair.publicKey),
    secretKey: naclUtil.encodeBase64(keyPair.secretKey),
  };
}

export function generateIdentityKeys(): {
  identityKey: KeyPair;
  signedPreKey: KeyPair;
} {
  return {
    identityKey: generateKeyPair(),
    signedPreKey: generateKeyPair(),
  };
}

export function encryptMessage(
  message: string,
  recipientPublicKey: string,
  senderSecretKey: string
): EncryptedMessage {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = naclUtil.decodeUTF8(message);
  const publicKeyUint8 = naclUtil.decodeBase64(recipientPublicKey);
  const secretKeyUint8 = naclUtil.decodeBase64(senderSecretKey);

  const encrypted = nacl.box(messageUint8, nonce, publicKeyUint8, secretKeyUint8);

  return {
    encryptedContent: naclUtil.encodeBase64(encrypted),
    nonce: naclUtil.encodeBase64(nonce),
  };
}

export function decryptMessage(
  encryptedContent: string,
  nonce: string,
  senderPublicKey: string,
  recipientSecretKey: string
): string | null {
  try {
    const encryptedUint8 = naclUtil.decodeBase64(encryptedContent);
    const nonceUint8 = naclUtil.decodeBase64(nonce);
    const publicKeyUint8 = naclUtil.decodeBase64(senderPublicKey);
    const secretKeyUint8 = naclUtil.decodeBase64(recipientSecretKey);

    const decrypted = nacl.box.open(
      encryptedUint8,
      nonceUint8,
      publicKeyUint8,
      secretKeyUint8
    );

    if (!decrypted) {
      return null;
    }

    return naclUtil.encodeUTF8(decrypted);
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
}

export function generateSafetyNumber(
  publicKey1: string,
  publicKey2: string
): string {
  // Sort keys alphabetically to ensure consistent safety number on both devices
  const keys = [publicKey1, publicKey2].sort();
  const combined = keys[0] + keys[1];
  const hash = nacl.hash(naclUtil.decodeUTF8(combined));
  const hashBase64 = naclUtil.encodeBase64(hash);
  
  const digits = hashBase64
    .replace(/[^A-Za-z0-9]/g, "")
    .substring(0, 60)
    .toUpperCase();
  
  const groups = [];
  for (let i = 0; i < digits.length; i += 5) {
    groups.push(digits.substring(i, i + 5));
  }
  
  return groups.join(" ");
}

export function generatePairingCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  const randomBytes = nacl.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return code;
}
