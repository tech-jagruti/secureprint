import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { HttpError } from '../lib/httpError.js';
import { normalizeJobId } from '../lib/ids.js';
import * as store from '../store/jobStore.js';

// Protects preview + print. The token alone isn't enough: the job must still be live.
export function requireSession(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Missing session token.'));

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return next(new HttpError(401, 'Session expired. Enter the code again.'));
  }

  const jobId = normalizeJobId(req.params.jobId);
  if (!jobId || payload.jid !== jobId) return next(new HttpError(403, 'Token does not match this job.'));

  const job = store.get(jobId);
  if (!job || job.status !== 'active' || job.fileDeleted || Date.now() >= job.expiresAt) {
    return next(new HttpError(410, 'This job has expired or was already printed.'));
  }

  req.job = job;
  next();
}
