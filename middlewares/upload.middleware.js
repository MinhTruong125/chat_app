const multer = require("multer");
const path = require("path");

// Thiết lập nơi lưu ảnh
const storage = multer.memoryStorage();

// Bộ lọc chỉ cho phép ảnh
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận file ảnh JPEG, PNG, JPG"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Giới hạn 5MB
});

module.exports = upload;