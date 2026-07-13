import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

const PREFIX = 'scrypt$';

/**
 * Hache un mot de passe avec scrypt (sel aléatoire de 16 octets).
 * Format stocké : `scrypt$<saltHex>:<hashHex>`.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${PREFIX}${salt}:${derived.toString('hex')}`;
}

/**
 * Vérifie un mot de passe contre la valeur stockée.
 * Rétro-compatible : si la valeur stockée n'est pas au format scrypt (données
 * existantes en clair), compare directement (fallback legacy).
 */
export async function verifyPassword(
  password: string,
  stored: string | null | undefined
): Promise<boolean> {
  if (!stored) return false;

  if (!stored.startsWith(PREFIX)) {
    return stored === password;
  }

  const [, salt, hash] = stored.split(':');
  if (!salt || !hash) return false;

  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const hashBuf = Buffer.from(hash, 'hex');
  if (derived.length !== hashBuf.length) return false;
  return timingSafeEqual(derived, hashBuf);
}
