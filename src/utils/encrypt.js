import crypto from 'crypto';
import { config } from '../config/environment.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey() {
  const raw = config.ENCRYPTION_KEY;
  if (!raw || typeof raw !== 'string') {
    throw new Error('ENCRYPTION_KEY is not set');
  }
  return crypto.scryptSync(raw, 'hikaweb-email-salt', KEY_LENGTH);
}

/**
 * Encrypt a string (e.g. email account password).
 * @param {string} plainText
 * @returns {string} base64(iv:tag:ciphertext)
 */
export function encrypt(plainText) {
  if (!plainText) return '';
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const enc = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

/**
 * Decrypt a string.
 * @param {string} encryptedBase64
 * @returns {string}
 */
export function decrypt(encryptedBase64) {
  if (!encryptedBase64) return '';
  const key = getKey();
  const buf = Buffer.from(encryptedBase64, 'base64');
  if (buf.length < IV_LENGTH + TAG_LENGTH) return '';
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}
