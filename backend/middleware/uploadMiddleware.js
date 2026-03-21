import { createRequire } from "module";
const require = createRequire(import.meta.url);
const multer = require("multer");

import path from "path";
import fs from "fs";

// ─── Ensure uploads/ folder exists ───────────────────────────────────────────
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ─── Storage Config ───────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${timestamp}_${safeName}`);
  },
});

// ─── File Filter (images only) ────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const isValid = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );
  if (isValid) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpg, jpeg, png, webp)."));
  }
};

// ─── Export Multer Instance ───────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per file
});

export default upload;