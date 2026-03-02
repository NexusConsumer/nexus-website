import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

/** Hash a password with bcrypt */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** Compare plaintext with bcrypt hash */
export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Generate a cryptographically random token (URL-safe base64) */
export function generateToken(bytes = 64): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** SHA-256 hash a token for storage */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** HMAC-SHA256 for webhook signature verification */
export function hmacSha256(secret: string, data: string | Buffer): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}
