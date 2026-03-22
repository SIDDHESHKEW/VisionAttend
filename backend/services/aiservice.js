import fs from "fs";
import path from "path";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// ─── Helper: convert image file to base64 ────────────────────────────────────
const imageToBase64 = (imagePath) => {
  const absolutePath = path.resolve(imagePath);
  const buffer = fs.readFileSync(absolutePath);
  return buffer.toString("base64");
};

// ─── Phase 3: Get face embedding from AI service ──────────────────────────────
export const getFaceEmbeddings = async (imagePaths) => {
  console.log("🤖 [AI] Extracting embeddings for", imagePaths.length, "image(s)...");

  try {
    // Try each image, return the first successful embedding
    for (const imagePath of imagePaths) {
      try {
        const base64Image = imageToBase64(imagePath);

        const response = await fetch(`${AI_SERVICE_URL}/embed`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ image: base64Image }),
        });

        if (!response.ok) {
          const err = await response.json();
          console.warn(`⚠️  Embed failed for ${imagePath}:`, err.detail);
          continue;
        }

        const data = await response.json();
        console.log(`✅ Embedding extracted (${data.facesDetected} face detected)`);
        return JSON.stringify(data.embedding); // 512-dim vector as JSON string

      } catch (imgError) {
        console.warn(`⚠️  Could not process ${imagePath}:`, imgError.message);
        continue;
      }
    }

    console.warn("⚠️  No valid embedding from any image. Storing null.");
    return null;

  } catch (error) {
    console.error("❌ getFaceEmbeddings error:", error.message);
    return null;
  }
};

// ─── Alias for backward compat (Phase 3 userController uses this) ─────────────
export const processFaceImages = getFaceEmbeddings;

// ─── Phase 4: Recognize faces in classroom image ─────────────────────────────
export const recognizeFacesFromClassImage = async (imagePath, students = []) => {
  console.log("🤖 [AI] Recognizing faces in:", imagePath);
  console.log(`👥 Matching against ${students.length} student(s)...`);

  try {
    const base64Image = imageToBase64(imagePath);

    // Build student payload — only include those with real embeddings
    const studentPayload = students
      .map((s) => {
        let embedding = null;

        if (s.faceEmbeddings && s.faceEmbeddings !== "dummy-embeddings") {
          try {
            embedding = JSON.parse(s.faceEmbeddings);
            // Validate it's a proper array of numbers
            if (!Array.isArray(embedding) || embedding.length === 0) {
              embedding = null;
            }
          } catch {
            embedding = null;
          }
        }

        return { id: s.id, embedding };
      });

    const studentsWithEmbeddings = studentPayload.filter((s) => s.embedding !== null);
    console.log(`📊 ${studentsWithEmbeddings.length}/${students.length} students have embeddings`);

    if (studentsWithEmbeddings.length === 0) {
      console.warn("⚠️  No students have stored embeddings — all will be marked Absent.");
      return [];
    }

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
    console.log(`✅ AI result → Detected: ${data.totalDetected} | Matched: ${data.totalMatched}`);

    if (data.matchedStudents.length > 0) {
      data.matchedStudents.forEach((m) => {
        console.log(`   ✅ Present: ${m.studentId} (similarity: ${m.similarity})`);
      });
    } else {
      console.log("   ⚠️  No students matched in this image.");
    }

    return data.matchedStudents; // [{ studentId, similarity }]

  } catch (error) {
    console.error("❌ recognizeFacesFromClassImage error:", error.message);
    return [];
  }
};