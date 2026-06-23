import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'misc';
    if (file.fieldname === 'profile_image') folder = 'profiles';
    else if (file.fieldname === 'attachment') folder = 'leaves';

    const uploadPath = path.join(process.cwd(), 'uploads', folder);
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedImages = ['.jpg', '.jpeg', '.png', '.webp'];
  const allowedDocs = ['.pdf', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (file.fieldname === 'profile_image' && allowedImages.includes(ext)) return cb(null, true);
  if (file.fieldname === 'attachment' && allowedDocs.includes(ext)) return cb(null, true);

  cb(new Error('Invalid file type'), false);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 },
});
