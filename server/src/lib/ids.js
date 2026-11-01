import crypto from 'node:crypto';
import { config } from '../config.js';

// No I, L, O, 0, 1: easy to misread over a shop counter.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const ID_LENGTH = 8;

export function generateJobId() {
  let out = '';
  for (let i = 0; i < ID_LENGTH; i++) out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return `SP-${out}`;
}

export function generateCode(length) {
  let out = '';
  for (let i = 0; i < length; i++) out += crypto.randomInt(10);
  return out;
}

// Accepts "sp-abcd2345", "SPABCD2345", "abcd 2345" ... returns "SP-ABCD2345" or null.
export function normalizeJobId(raw) {
  let s = String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.startsWith('SP') && s.length === ID_LENGTH + 2) s = s.slice(2);
  if (s.length !== ID_LENGTH) return null;
  for (const ch of s) if (!ALPHABET.includes(ch)) return null;
  return `SP-${s}`;
}

// Codes are never stored in plain text. HMAC with a server secret, bound to the job ID.
export function hashCode(jobId, code) {
  return crypto.createHmac('sha256', config.codeSecret).update(`${jobId}:${code}`).digest('hex');
}

export function verifyCode(jobId, code, expectedHash) {
  const a = Buffer.from(hashCode(jobId, code), 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
