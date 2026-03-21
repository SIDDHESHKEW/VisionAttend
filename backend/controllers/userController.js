import User from "../models/User.js";
import { processFaceImages } from "../services/aiService.js";

// ─── UPLOAD FACE IMAGES ───────────────────────────────────────────────────────
export const uploadFaceImages = async (req, res) => {
  try {
    // 1. Check files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No images uploaded." });
    }

    // 2. Build array of saved file paths
    const imagePaths = req.files.map((file) => `uploads/${file.filename}`);

    console.log("📸 Uploaded face images:", imagePaths);

    // 3. Call AI service (stub → returns "dummy-embeddings" for now)
    const embeddings = await processFaceImages(imagePaths);

    // 4. Find the logged-in user and update their face data
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // 5. Merge with existing images if any, then save
    const existingImages = user.faceImages ? JSON.parse(user.faceImages) : [];
    const allImages = [...existingImages, ...imagePaths];

    await user.update({
      faceImages: JSON.stringify(allImages),
      faceEmbeddings: embeddings,
    });

    return res.status(200).json({
      message: "Face data saved",
      uploadedImages: imagePaths,
      totalImages: allImages.length,
    });
  } catch (error) {
    console.error("Face upload error:", error);
    return res.status(500).json({ message: "Server error during face upload." });
  }
};

// ─── GET FACE DATA (optional helper route) ────────────────────────────────────
export const getFaceData = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "faceImages", "faceEmbeddings"],
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({
      id: user.id,
      name: user.name,
      faceImages: user.faceImages ? JSON.parse(user.faceImages) : [],
      hasEmbeddings: !!user.faceEmbeddings,
    });
  } catch (error) {
    console.error("Get face data error:", error);
    return res.status(500).json({ message: "Server error." });
  }
};