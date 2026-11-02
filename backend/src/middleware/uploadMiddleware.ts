import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../../uploads');
const branchesDir = path.join(uploadDir, 'branches');
const roomsDir = path.join(uploadDir, 'rooms');

[uploadDir, branchesDir, roomsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration for branches
const branchStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, branchesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `branch-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Storage configuration for rooms
const roomStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, roomsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `room-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// File filter to only accept images
const imageFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Multer instances
export const uploadBranchImage = multer({
  storage: branchStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFilter,
}).single('image');

export const uploadRoomImage = multer({
  storage: roomStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: imageFilter,
}).single('image');

export const uploadMultipleBranchImages = multer({
  storage: branchStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 }, // 5MB per image, max 10 images
  fileFilter: imageFilter,
}).array('images', 10);

export const uploadMultipleRoomImages = multer({
  storage: roomStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 }, // 5MB per image, max 10 images
  fileFilter: imageFilter,
}).array('images', 10);
