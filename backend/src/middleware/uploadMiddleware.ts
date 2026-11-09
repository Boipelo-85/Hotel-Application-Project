import multer from 'multer';
import sharp from 'sharp';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { RequestHandler } from 'express';
import { AppError } from '../utils/errors.js';

const uploadDir = fileURLToPath(new URL('../../uploads/', import.meta.url));
const allowedMime = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 10, fields: 20, parts: 30 },
  fileFilter(_req, file, cb) {
    if (!allowedMime.has(file.mimetype) || !allowedExtensions.has(path.extname(file.originalname).toLowerCase())) {
      cb(new AppError(400, 'Choose a JPEG, PNG, GIF, or WebP image', 'INVALID_IMAGE_TYPE'));
    } else cb(null, true);
  },
});

export async function normalizeImage(buffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(buffer, { limitInputPixels: 25_000_000, failOn: 'warning' });
    const metadata = await image.metadata();
    if (!metadata.format || !['jpeg', 'png', 'gif', 'webp'].includes(metadata.format)) throw new Error();
    // Decode and re-encode the first frame; strip metadata and appended payloads.
    return await image.rotate().resize({ width: 4096, height: 4096, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  } catch {
    throw new AppError(400, 'The uploaded file is not a valid supported image', 'INVALID_IMAGE_CONTENT');
  }
}

async function storeBranchPhoto(buffer: Buffer, filename: string): Promise<string | undefined> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const key = process.env.CLOUDINARY_API_KEY?.trim();
  const secret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloud && !key && !secret) return undefined;
  if (!cloud || !key || !secret) {
    throw new AppError(503, 'Branch photo storage is not fully configured', 'IMAGE_STORAGE_UNAVAILABLE');
  }

  const publicId = 'hotel-branches/' + filename.slice(0, -5);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHash('sha256').update('public_id=' + publicId + '&timestamp=' + timestamp + secret).digest('hex');
  const form = new FormData();
  form.set('file', new Blob([new Uint8Array(buffer)], { type: 'image/webp' }), filename);
  form.set('api_key', key);
  form.set('public_id', publicId);
  form.set('timestamp', timestamp);
  form.set('signature', signature);

  try {
    const response = await fetch('https://api.cloudinary.com/v1_1/' + encodeURIComponent(cloud) + '/image/upload', {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(20_000),
    });
    const result = await response.json();
    if (response.ok && typeof result.secure_url === 'string' && new URL(result.secure_url).origin === 'https://res.cloudinary.com') {
      return result.secure_url;
    }
  } catch {
    // Keep provider credentials and response details out of the API error.
  }
  throw new AppError(503, 'Branch photo storage is unavailable. Please try again.', 'IMAGE_STORAGE_UNAVAILABLE');
}

function imageUpload(folder: 'branches' | 'rooms', multiple: boolean): RequestHandler {
  const parse = multiple ? parser.array('images', 10) : parser.single('image');
  return (req, res, next) => {
    parse(req, res, error => {
      if (error) { next(error); return; }
      void (async () => {
        const files = req.file ? [req.file] : Array.isArray(req.files) ? req.files : [];
        const outputs = [];
        for (const file of files) outputs.push(await normalizeImage(file.buffer));
        const destination = path.join(uploadDir, folder);
        const saved: string[] = [];
        try {
          for (let i = 0; i < files.length; i++) {
            const file = files[i]!;
            const filename = randomUUID() + '.webp';
            const cloudUrl = folder === 'branches' ? await storeBranchPhoto(outputs[i]!, filename) : undefined;
            const target = cloudUrl ?? path.join(destination, filename);
            if (!cloudUrl) {
              await mkdir(destination, { recursive: true });
              await writeFile(target, outputs[i]!, { flag: 'wx' });
              saved.push(target);
            }
            Object.assign(file, { filename, destination, path: target, mimetype: 'image/webp', size: outputs[i]!.length });
            file.buffer = Buffer.alloc(0);
          }
        } catch (err) {
          await Promise.all(saved.map(file => unlink(file).catch(() => {})));
          throw err;
        }
        res.once('finish', () => {
          if (res.statusCode >= 400) void Promise.all(saved.map(file => unlink(file).catch(() => {})));
        });
        next();
      })().catch(next);
    });
  };
}

export const uploadBranchImage = imageUpload('branches', false);
export const uploadRoomImage = imageUpload('rooms', false);
export const uploadMultipleBranchImages = imageUpload('branches', true);
export const uploadMultipleRoomImages = imageUpload('rooms', true);
