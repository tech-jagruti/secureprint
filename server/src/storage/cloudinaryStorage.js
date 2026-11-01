import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config.js';

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true,
});

export const cloudinaryStorage = {
  name: 'cloudinary',

  // type: "authenticated" means there is NO public URL. Every delivery needs a signature.
  upload(buffer) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { type: 'authenticated', resource_type: 'auto', folder: 'secureprint' },
        (err, res) => {
          if (err) return reject(err);
          console.log('[cloudinary] uploaded document URL:', res.secure_url);
          resolve({ publicId: res.public_id, resourceType: res.resource_type, format: res.format });
        },
      );
      stream.end(buffer);
    });
  },

  // The server fetches the file with a 60-second signed URL and relays it.
  // The browser never sees a Cloudinary URL.
  async download(ref) {
    const url = cloudinary.utils.private_download_url(ref.publicId, ref.format, {
      resource_type: ref.resourceType,
      type: 'authenticated',
      expires_at: Math.floor(Date.now() / 1000) + 60,
    });
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Cloudinary download failed (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  },

  // Throws unless Cloudinary confirms the asset is gone. The caller retries on failure.
  async remove(ref) {
    const res = await cloudinary.uploader.destroy(ref.publicId, {
      resource_type: ref.resourceType,
      type: 'authenticated',
      invalidate: true,
    });
    if (res.result !== 'ok' && res.result !== 'not found') {
      throw new Error(`Cloudinary destroy returned "${res.result}"`);
    }
  },
};
