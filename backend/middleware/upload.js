import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'misc';

    if (file.fieldname === 'profile_image') {
      folder = 'profiles';
    } else if (file.fieldname === 'attachment') {
      folder = 'leaves';
    }

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

  const imageTypes = [
    'image/jpeg',
    'image/png',
    'image/webp'
  ];

  const docTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png'
  ];

  if (
    file.fieldname === 'profile_image' &&
    imageTypes.includes(file.mimetype)
  ) {
    return cb(null, true);
  }

  if (
    file.fieldname === 'attachment' &&
    docTypes.includes(file.mimetype)
  ) {
    return cb(null, true);
  }

  return cb(new Error('Invalid file type'), false);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
    files: 1,
  },
});