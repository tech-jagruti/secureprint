import path from 'node:path';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from '../lib/httpError.js';
import { generateCode, generateJobId, hashCode, normalizeJobId, verifyCode } from '../lib/ids.js';
import { storage } from '../storage/index.js';
import * as store from '../store/jobStore.js';

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const isExpired = (job) => Date.now() >= job.expiresAt;
const GONE = () => new HttpError(410, 'This job has expired or was already printed.');

export const publicJob = (job) => ({
  jobId: job.jobId,
  fileName: job.fileName,
  mimeType: job.mimeType,
  size: job.size,
  expiresAt: job.expiresAt,
});

export async function createJob(file, expiryMinutes) {
  const minutes = clamp(
    Number(expiryMinutes) || config.defaultExpiryMinutes,
    config.minExpiryMinutes,
    config.maxExpiryMinutes,
  );

  let jobId = generateJobId();
  while (store.get(jobId)) jobId = generateJobId();
  const code = generateCode(config.codeLength);

  const storageRef = await storage.upload(file.buffer, { mimeType: file.mimetype });
  const now = Date.now();

  const job = store.save({
    jobId,
    codeHash: hashCode(jobId, code),
    storageRef,
    fileName: path.basename(file.originalname || 'document').slice(0, 120),
    mimeType: file.mimetype,
    size: file.size,
    createdAt: now,
    expiresAt: now + minutes * 60_000,
    failedAttempts: 0,
    status: 'active', // active | locked | printed | expired
    fileDeleted: false,
  });

  // The plain code is returned exactly once and never stored.
  return { ...publicJob(job), code, storage: storage.name };
}

// Synchronous on purpose: check-and-increment can't interleave between requests.
export function verifyAccess(rawJobId, rawCode) {
  const jobId = normalizeJobId(rawJobId);
  const code = String(rawCode ?? '').trim();
  const job = jobId ? store.get(jobId) : null;
  const wrong = (extra) => new HttpError(401, 'Job ID or code is incorrect.', extra);

  if (!job || code.length !== config.codeLength || !/^\d+$/.test(code)) throw wrong();

  const lockedError = () =>
    new HttpError(423, 'Too many wrong codes. This job is locked. Ask the customer to upload again.');

  if (job.status === 'locked') throw lockedError();
  if (job.status !== 'active' || job.fileDeleted || isExpired(job)) throw GONE();

  if (!verifyCode(job.jobId, code, job.codeHash)) {
    const failedAttempts = job.failedAttempts + 1;
    const locked = failedAttempts >= config.maxAttempts;
    store.update(job.jobId, { failedAttempts, status: locked ? 'locked' : 'active' });
    if (locked) throw lockedError();
    throw wrong({ attemptsLeft: config.maxAttempts - failedAttempts });
  }

  store.update(job.jobId, { failedAttempts: 0 });

  const ttlSeconds = Math.min(config.sessionMinutes * 60, Math.floor((job.expiresAt - Date.now()) / 1000));
  if (ttlSeconds <= 0) throw GONE();

  const token = jwt.sign({ jid: job.jobId }, config.jwtSecret, { expiresIn: ttlSeconds });
  return { token, job: publicJob(job) };
}

export async function getPreview(job) {
  const buffer = await storage.download(job.storageRef);
  return { buffer, mimeType: job.mimeType };
}

export function getStatus(rawJobId) {
  const jobId = normalizeJobId(rawJobId);
  const job = jobId ? store.get(jobId) : null;
  if (!job) throw new HttpError(404, 'Job not found.');
  return {
    status: job.status,
    fileDeleted: job.fileDeleted,
    expiresAt: job.expiresAt,
  };
}

export async function deleteByOwner(rawJobId, rawCode) {
  const jobId = normalizeJobId(rawJobId);
  const code = String(rawCode ?? '').trim();
  const job = jobId ? store.get(jobId) : null;
  const invalid = () => new HttpError(401, 'Job ID or code is incorrect.');

  if (!job || code.length !== config.codeLength || !/^\d+$/.test(code) || !verifyCode(jobId, code, job.codeHash)) {
    throw invalid();
  }
  if (job.fileDeleted) return { fileDeleted: true };

  store.update(jobId, { status: 'deleted', deleteRequestedAt: Date.now() });
  const fileDeleted = await removeFile(jobId);
  return { fileDeleted };
}

// --- Deletion -------------------------------------------------------------

const inFlight = new Set();

// Only flips fileDeleted after the storage provider confirms. Failures are retried by sweep().
export async function removeFile(jobId) {
  const job = store.get(jobId);
  if (!job) return false;
  if (job.fileDeleted) return true;
  if (inFlight.has(jobId)) return false;

  inFlight.add(jobId);
  try {
    await storage.remove(job.storageRef);
    store.update(jobId, { fileDeleted: true, deletedAt: Date.now() });
    console.log(`[cleanup] deleted file for ${jobId}`);
    return true;
  } catch (err) {
    console.error(`[cleanup] delete failed for ${jobId}, will retry:`, err.message);
    return false;
  } finally {
    inFlight.delete(jobId);
  }
}

export async function markPrinted(job) {
  store.update(job.jobId, { status: 'printed', printedAt: Date.now() });
  const fileDeleted = await removeFile(job.jobId);
  return { fileDeleted };
}

export async function sweep() {
  const now = Date.now();
  for (const job of store.all()) {
    const expired = now >= job.expiresAt;

    if (!job.fileDeleted && (expired || job.status === 'printed' || job.status === 'deleted')) {
      await removeFile(job.jobId);
    }

    const fresh = store.get(job.jobId);
    if (!fresh) continue;

    if (expired && fresh.fileDeleted && ['active', 'locked'].includes(fresh.status)) {
      store.update(fresh.jobId, { status: 'expired' });
    }
    if (fresh.fileDeleted && now - fresh.expiresAt > config.retainRecordMs) {
      store.remove(fresh.jobId);
    }
  }
}
