import fs from "fs";
import path from "path";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// ─── Helper: convert image file to base64 ────────────────────────────────────
const imageToBase64 = (imagePath) => {
  const absolutePath = path.resolve(imagePath);
  const imageBuffer  = fs.readFileSync(absolutePath);
  return imageBuffer.toString("base64");
};

// ─── Phase 3: Register face → get embedding from AI service ──────────────────
export const processFaceImages = async (imagePaths) => {
  console.log("🤖 [AI] Extracting embeddings for:", imagePaths);

  try {
    // Use the first (best) image for embedding
    const base64Image = imageToBase64(imagePaths[0]);

    const response = await fetch(`${AI_SERVICE_URL}/embed`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Embedding failed");
    }

    const data = await response.json();
    console.log(`✅ Embedding extracted (${data.facesDetected} face(s) detected)`);

    // Return embedding as JSON string for DB storage
    return JSON.stringify(data.embedding);

  } catch (error) {
    console.error("❌ AI embed error:", error.message);
    // Fallback: return dummy embedding so registration doesn't fail
    return "dummy-embeddings";
  }
};

// ─── Phase 4: Recognize faces in classroom image ──────────────────────────────
export const recognizeFacesFromClassImage = async (imagePath, students = []) => {
  console.log("🤖 [AI] Recognizing faces in:", imagePath);

  try {
    const base64Image = imageToBase64(imagePath);

    // Build student list with their stored embeddings
    const studentPayload = students.map((s) => ({
      id: s.id,
      embedding: s.faceEmbeddings && s.faceEmbeddings !== "dummy-embeddings"
        ? JSON.parse(s.faceEmbeddings)
        : null,
    }));

    const response = await fetch(`${AI_SERVICE_URL}/recognize`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        image:     base64Image,
        students:  studentPayload,
        threshold: 0.5,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Recognition failed");
    }

    const data = await response.json();
    console.log(`✅ Recognized: ${data.totalMatched}/${data.totalDetected} faces matched`);

    return data.matchedStudents; // [{ studentId, similarity }]

  } catch (error) {
    console.error("❌ AI recognize error:", error.message);
    // Fallback to empty array — all students marked absent
    return [];
  }
};