import 'dotenv/config';

const int = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
};

const cloudinary = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
};

export const config = {
  port: int(process.env.PORT, 5000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  jwtSecret: process.env.JWT_SECRET || 'dev-only-jwt-secret',
  codeSecret: process.env.CODE_SECRET || 'dev-only-code-secret',

  codeLength: int(process.env.CODE_LENGTH, 4),
  maxAttempts: int(process.env.MAX_ATTEMPTS, 5),
  maxFileBytes: int(process.env.MAX_FILE_MB, 10) * 1024 * 1024,

  sessionMinutes: 10, // how long a shopkeeper session lasts (also capped by job expiry)
  minExpiryMinutes: 1,
  maxExpiryMinutes: 120,
  defaultExpiryMinutes: 15,

  cleanupIntervalMs: 15_000,
  retainRecordMs: 24 * 60 * 60 * 1000, // keep finished job records for a day

  cloudinary,
  useCloudinary: Boolean(cloudinary.cloudName && cloudinary.apiKey && cloudinary.apiSecret),
};

if (!process.env.JWT_SECRET || !process.env.CODE_SECRET) {
  console.warn('[config] JWT_SECRET / CODE_SECRET not set. Using insecure dev defaults.');
}
