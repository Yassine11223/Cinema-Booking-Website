const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'avatars');
fs.mkdirSync(uploadDir, { recursive: true });

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const storage = multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDir),
    filename: (_req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const uniqueName = `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
        callback(null, uniqueName);
    },
});

module.exports = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        if (allowedExtensions.has(extension) && allowedMimeTypes.has(file.mimetype)) {
            return callback(null, true);
        }

        const error = new Error('Only JPG, JPEG, PNG, and WEBP images are allowed.');
        error.status = 400;
        return callback(error);
    },
});
