import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const apartmentUploadDir = path.resolve(__dirname, '../../../uploads/apartments');

if (!fs.existsSync(apartmentUploadDir)) {
  fs.mkdirSync(apartmentUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, apartmentUploadDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${extension}`);
  }
});

const fileFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
    return;
  }

  cb(new Error('Only image files are allowed'));
};

const apartmentImageUpload = multer({
  storage,
  fileFilter,
  limits: {
    files: 8,
    fileSize: 5 * 1024 * 1024
  }
});

const uploadApartmentImages = apartmentImageUpload.array('images', 8);

export { uploadApartmentImages };