import { HttpError } from '../lib/httpError.js';

export function notFound(req, res, next) {
  next(new HttpError(404, 'Not found.'));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File is too large.' });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...err.extra });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
}
