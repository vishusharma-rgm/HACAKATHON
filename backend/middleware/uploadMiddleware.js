const multer = require("multer");

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const isPdfMime = file.mimetype === "application/pdf";
  const isPdfName = file.originalname && file.originalname.toLowerCase().endsWith(".pdf");

  if (isPdfMime || isPdfName) {
    return cb(null, true);
  }

  return cb(new Error("Only PDF files are allowed."));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = upload;
