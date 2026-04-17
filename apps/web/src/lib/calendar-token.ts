import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const PREFIX = "enc:v1:";

function getKey(): Buffer | null {
  const hex = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) return null;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    return null;
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) return null;
  return key;
}

function assertProductionKey(): Buffer {
  const key = getKey();
  if (key) return key;
  throw new Error(
    "CALENDAR_TOKEN_ENCRYPTION_KEY (64 hex chars) is required in production",
  );
}

export function encryptRefreshToken(plain: string): string {
  const key =
    process.env.NODE_ENV === "production" ? assertProductionKey() : getKey();
  if (!key) {
    return plain;
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${Buffer.concat([iv, tag, enc]).toString("base64url")}`;
}

export function decryptRefreshToken(stored: string): string {
  if (!stored.startsWith(PREFIX)) {
    return stored;
  }
  const key = getKey();
  if (!key) {
    throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY required to decrypt token");
  }
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64url");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}

export const encryptIntegrationToken = encryptRefreshToken;
export const decryptIntegrationToken = decryptRefreshToken;
