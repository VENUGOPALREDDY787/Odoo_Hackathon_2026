import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { AppError } from '../errors/AppError';
import { Request } from 'express';

const UPLOAD_DIR = path.join(__dirname, '../../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Storage Configuration
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    // Generate secure randomized filename to prevent overwriting and path traversal
    const randomHex = crypto.randomBytes(16).toString('hex');
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomHex}${extension}`);
  }
});

// File Filter Security Checks
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];

  const extension = path.extname(file.originalname).toLowerCase();
  const isExtensionAllowed = allowedExtensions.includes(extension);
  const isMimeAllowed = allowedMimeTypes.includes(file.mimetype);

  if (isExtensionAllowed && isMimeAllowed) {
    cb(null, true);
  } else {
    cb(new AppError('Only images (JPEG, PNG) and PDF files are allowed.', 400, 'UNSUPPORTED_FILE_TYPE') as any, false);
  }
};

// Configured Multer instance with 5MB file limit
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export default upload;
