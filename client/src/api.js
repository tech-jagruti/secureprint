const BASE = import.meta.env.VITE_API_URL || '/api';

async function parse(res) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    const err = new Error(body?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = body;
    throw err;
  }
  return body;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

export const getConfig = () => fetch(`${BASE}/config`).then(parse);

export function uploadFile(file, expiryMinutes) {
  const form = new FormData();
  form.append('file', file);
  form.append('expiryMinutes', String(expiryMinutes));
  return fetch(`${BASE}/jobs`, { method: 'POST', body: form }).then(parse);
}

export const getStatus = (jobId) => fetch(`${BASE}/jobs/${jobId}/status`).then(parse);

export const deleteUploadedFile = (jobId, code) =>
  fetch(`${BASE}/jobs/${jobId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  }).then(parse);

export const verifyAccess = (jobId, code) =>
  fetch(`${BASE}/shop/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, code }),
  }).then(parse);

export async function fetchPreview(jobId, token) {
  const res = await fetch(`${BASE}/shop/jobs/${jobId}/preview`, { headers: auth(token) });
  if (!res.ok) await parse(res);
  return res.blob();
}

export const sendToPrinter = (jobId, token) =>
  fetch(`${BASE}/shop/jobs/${jobId}/print`, { method: 'POST', headers: auth(token) }).then(parse);
