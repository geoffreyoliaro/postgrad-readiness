import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

/** Returns `salt:hexHash` for storage in profiles.password_hash. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (salt === undefined || hash === undefined) {
    return false;
  }
  const candidate = scryptSync(password, salt, KEY_LENGTH);
  const known = Buffer.from(hash, "hex");
  if (candidate.length !== known.length) {
    return false;
  }
  return timingSafeEqual(candidate, known);
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export const SESSION_TTL_DAYS = 30;

export function sessionExpiry(): string {
  const now = Date.now();
  const expires = now + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
  return new Date(expires).toISOString();
}
