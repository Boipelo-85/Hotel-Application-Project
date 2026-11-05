import multer from 'multer';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
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
        await mkdir(destination, { recursive: true });
        const saved: string[] = [];
        try {
          for (let i = 0; i < files.length; i++) {
            const file = files[i]!;
            const filename = randomUUID() + '.webp';
            const target = path.join(destination, filename);
            saved.push(target);
            await writeFile(target, outputs[i]!, { flag: 'wx' });
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
