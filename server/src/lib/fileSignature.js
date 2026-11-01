// Don't trust the client's Content-Type. Check the first bytes of the file.
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const DOC = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

export const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export function matchesSignature(buf, mime) {
  if (!buf || buf.length < 8) return false;
  switch (mime) {
    case 'application/pdf':
      return buf.subarray(0, 5).toString('latin1') === '%PDF-';
    case 'image/png':
      return buf.subarray(0, 8).equals(PNG);
    case 'image/jpeg':
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    case 'application/msword':
      return buf.subarray(0, 8).equals(DOC);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
    default:
      return false;
  }
}
