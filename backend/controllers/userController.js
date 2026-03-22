import User from "../models/User.js";
import { getFaceEmbeddings } from "../services/aiService.js";

// ─── UPLOAD FACE IMAGES + EXTRACT REAL EMBEDDINGS ────────────────────────────
export const uploadFaceImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No images uploaded." });
    }

    const imagePaths = req.files.map((file) => `uploads/${file.filename}`);
    console.log("📸 Uploaded face images:", imagePaths);

    // Call AI service to extract real face embedding
    const embedding = await getFaceEmbeddings(imagePaths);

    // Find user in DB
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Merge image paths with existing ones
    const existingImages = user.faceImages ? JSON.parse(user.faceImages) : [];
    const allImages      = [...existingImages, ...imagePaths];

    // Save images + embedding
    await user.update({
      faceImages:     JSON.stringify(allImages),
      faceEmbeddings: embedding,  // real 512-dim vector or null
    });

    const embeddingStatus = embedding
      ? "✅ Real face embedding stored"
      : "⚠️  No face detected — embedding not stored";

    console.log(embeddingStatus);

    return res.status(200).json({
      message:         "Face data saved",
      uploadedImages:  imagePaths,
      totalImages:     allImages.length,
      embeddingStored: !!embedding,
      embeddingStatus,
    });

  } catch (error) {
    console.error("Face upload error:", error);
    return res.status(500).json({ message: "Server error during face upload." });
  }
};

// ─── GET FACE DATA ────────────────────────────────────────────────────────────
export const getFaceData = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "faceImages", "faceEmbeddings"],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      id:             user.id,
      name:           user.name,
      faceImages:     user.faceImages ? JSON.parse(user.faceImages) : [],
      hasEmbeddings:  !!user.faceEmbeddings && user.faceEmbeddings !== "dummy-embeddings",
    });

  } catch (error) {
    console.error("Get face data error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};