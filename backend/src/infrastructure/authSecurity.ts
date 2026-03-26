import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const PASSWORD_HASH_PREFIX = 'scrypt';
const SCRYPT_KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;

    return `${PASSWORD_HASH_PREFIX}:${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
    const [algorithm, salt, storedHash] = encodedHash.split(':');

    if (algorithm !== PASSWORD_HASH_PREFIX || !salt || !storedHash) {
        return false;
    }

    const derivedKey = (await scrypt(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;
    const storedBuffer = Buffer.from(storedHash, 'hex');

    if (storedBuffer.length !== derivedKey.length) {
        return false;
    }

    return timingSafeEqual(storedBuffer, derivedKey);
}

export function generateSessionToken(): string {
    return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
}
