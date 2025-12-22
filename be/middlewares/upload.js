const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = 'uploads/';
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.fieldname}${ext}`);
  }
});

// Middleware kiểm tra type + size
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  const isImage = file.mimetype.startsWith('image/');
  const isVideo = file.mimetype.startsWith('video/');
  const is3D = ['.glb', '.gltf', '.fbx', '.obj'].includes(ext);

  if (!isImage && !isVideo && !is3D) {
    return cb(new Error('Chỉ hỗ trợ ảnh, video và model 3D'), false);
  }

  file._isImage = isImage;
  file._isVideo = isVideo;
  file._is3D = is3D;

  cb(null, true);
};


// Khởi tạo multer (bỏ limits chung)
const upload = multer({ storage, fileFilter });

// Middleware kiểm tra size riêng ảnh/video
const checkFileSize = (req, res, next) => {
  const files = req.files || [];
  for (const file of files) {
    if (file._isImage && file.size > 10 * 1024 * 1024)
      return res.status(400).json({ message: `Ảnh ${file.originalname} quá lớn (max 5MB)` });
    if (file._isVideo && file.size > 50 * 1024 * 1024)
      return res.status(400).json({ message: `Video ${file.originalname} quá lớn (max 50MB)` });
    if (file._is3D && file.size > 10 * 1024 * 1024)
      return res.status(400).json({message: `Model 3D ${file.originalname} quá lớn (max 10MB)`});
  }
  next();
};

module.exports = { upload, checkFileSize };
