/**
 * Image upload middleware for admin-managed movie assets.
 */
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDir = path.resolve(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase();
        const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '';
        cb(null, `movie-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
    },
});

const uploadImage = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype || !file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'));
        }
        cb(null, true);
    },
}).single('image');

function uploadMovieImage(req, res, next) {
    uploadImage(req, res, (err) => {
        if (err) {
            const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
            return res.status(status).json({ message: err.message });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Image file is required' });
        }

        const publicUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        return res.status(201).json({
            url: publicUrl,
            filename: req.file.filename,
            size: req.file.size,
        });
    });
}

module.exports = { uploadMovieImage, uploadDir };
