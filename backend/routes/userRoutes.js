import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import { uploadFaceImages, getFaceData } from "../controllers/userController.js";

const router = express.Router();

// POST /api/users/upload-face
// Auth required → upload up to 5 images → save to DB
router.post(
  "/upload-face",
  authMiddleware,
  upload.array("faces", 5),
  uploadFaceImages
);

// GET /api/users/face-data
// Auth required → returns saved image paths + embedding status
router.get("/face-data", authMiddleware, getFaceData);

export default router;