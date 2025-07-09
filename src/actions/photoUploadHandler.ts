import type { Request, Response } from 'express';
import multer from 'multer';
import { photos } from './photos'; // Import the photos action

// Configure multer for file upload
const storage = multer.memoryStorage(); // Store files in memory as Buffers
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const isValidType = allowedTypes.test(file.mimetype);

    if (isValidType) {
      return cb(null, true);
    } else {
      return cb(new Error('Only JPEG, PNG, and GIF formats are allowed'));
    }
  },
});

// Photo upload handler
export const handlePhotoUpload = (
  req: Request,
  res: Response,
  next: Function
) => {
  const uploadSingle = upload.single('photo');

  uploadSingle(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Multer error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    // Pass control to the next middleware/route handler
    next();
  });
};

// Import this handler into your server or route setup to handle photo uploads
