import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ALLOWED_TYPES, matchesSignature } from '../lib/fileSignature.js';
import { HttpError } from '../lib/httpError.js';
import { requireSession } from '../middleware/session.js';
import * as jobs from '../services/jobService.js';

const router = Router();

const limiter = (windowMinutes, max, message) =>
  rateLimit({
    windowMs: windowMinutes * 60_000,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
  });

const uploadLimiter = limiter(15, 30, 'Too many uploads. Try again in a few minutes.');
const verifyLimiter = limiter(15, 40, 'Too many attempts from this device. Try again later.');
const statusLimiter = limiter(1, 60, 'Slow down.');
const deleteLimiter = limiter(15, 10, 'Too many delete attempts. Try again later.');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileBytes, files: 1 },
  fileFilter: (req, file, cb) =>
    ALLOWED_TYPES.includes(file.mimetype)
      ? cb(null, true)
      : cb(new HttpError(415, 'Only PDF, PNG and JPG files are supported.')),
});

router.get('/config', (req, res) => {
  res.json({
    codeLength: config.codeLength,
    maxAttempts: config.maxAttempts,
    maxFileMb: config.maxFileBytes / 1024 / 1024,
  });
});

// 1. Customer uploads a file
router.post(
  '/jobs',
  uploadLimiter,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Choose a file to upload.');
    if (!matchesSignature(req.file.buffer, req.file.mimetype)) {
      throw new HttpError(415, 'That file does not look like a valid PDF, PNG or JPG.');
    }
    const receipt = await jobs.createJob(req.file, req.body.expiryMinutes);
    res.status(201).json(receipt);
  }),
);

// Customer's page polls this to show "printed" / "deleted"
router.get(
  '/jobs/:jobId/status',
  statusLimiter,
  asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'no-store').json(jobs.getStatus(req.params.jobId));
  }),
);

router.delete(
  '/jobs/:jobId',
  deleteLimiter,
  asyncHandler(async (req, res) => {
    const result = await jobs.deleteByOwner(req.params.jobId, req.body?.code);
    res.json(result);
  }),
);

// 2. Shopkeeper enters Job ID + code
router.post(
  '/shop/verify',
  verifyLimiter,
  asyncHandler(async (req, res) => {
    const { jobId, code } = req.body || {};
    res.set('Cache-Control', 'no-store').json(jobs.verifyAccess(jobId, code));
  }),
);

// 3. Preview: the server relays the file. No storage URL ever reaches the browser.
router.get(
  '/shop/jobs/:jobId/preview',
  requireSession,
  asyncHandler(async (req, res) => {
    const { buffer, mimeType } = await jobs.getPreview(req.job);
    res
      .set({
        'Content-Type': mimeType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      })
      .send(buffer);
  }),
);

// 4. Print: mark printed and delete the file right away
router.post(
  '/shop/jobs/:jobId/print',
  requireSession,
  asyncHandler(async (req, res) => {
    // Real printer integration (CUPS, PrintNode, etc.) would be called here.
    const { fileDeleted } = await jobs.markPrinted(req.job);
    res.json({ printed: true, fileDeleted });
  }),
);

export default router;
