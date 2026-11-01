// Tiny JSON-file store so the demo survives restarts.
// For production swap this module for MongoDB/Postgres/Redis. The API stays the same.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data');
const file = path.join(dir, 'jobs.json');
const jobs = new Map();

try {
  for (const job of JSON.parse(fs.readFileSync(file, 'utf8'))) jobs.set(job.jobId, job);
} catch {
  /* first run */
}

function persist() {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${file}.tmp`, JSON.stringify([...jobs.values()]));
  fs.renameSync(`${file}.tmp`, file);
}

export const get = (jobId) => jobs.get(jobId) ?? null;
export const all = () => [...jobs.values()];

export function save(job) {
  jobs.set(job.jobId, job);
  persist();
  return job;
}

export function update(jobId, patch) {
  const current = jobs.get(jobId);
  if (!current) return null;
  const next = { ...current, ...patch };
  jobs.set(jobId, next);
  persist();
  return next;
}

export function remove(jobId) {
  jobs.delete(jobId);
  persist();
}
