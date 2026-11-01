// Fallback so the whole flow runs without Cloudinary keys. Same interface.
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.local-storage');

export const localStorageAdapter = {
  name: 'local',

  async upload(buffer) {
    await fs.mkdir(dir, { recursive: true });
    const publicId = crypto.randomUUID();
    await fs.writeFile(path.join(dir, publicId), buffer);
    return { publicId };
  },

  download: (ref) => fs.readFile(path.join(dir, ref.publicId)),

  remove: (ref) => fs.rm(path.join(dir, ref.publicId), { force: true }),
};
