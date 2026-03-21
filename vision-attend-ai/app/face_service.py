import numpy as np
import cv2
import insightface
from insightface.app import FaceAnalysis
from app.utils import cosine_similarity

# ─── Singleton model instance ─────────────────────────────────────────────────
_face_app = None

SIMILARITY_THRESHOLD = 0.5   # Adjust: higher = stricter matching


def load_model() -> FaceAnalysis:
    """
    Load InsightFace FaceAnalysis model (buffalo_l).
    Downloads on first run (~200MB). Cached after that.
    """
    global _face_app

    if _face_app is not None:
        return _face_app

    print("🤖 Loading InsightFace model (first run may download weights)...")

    _face_app = FaceAnalysis(
        name="buffalo_l",           # High accuracy model
        providers=["CPUExecutionProvider"]  # Use GPU: ["CUDAExecutionProvider"]
    )
    _face_app.prepare(ctx_id=0, det_size=(640, 640))

    print("✅ InsightFace model loaded successfully.")
    return _face_app


def extract_embeddings(image: np.ndarray) -> list[dict]:
    """
    Detect all faces in the image and extract their embeddings.

    Args:
        image: BGR numpy array (OpenCV format)

    Returns:
        List of dicts with keys:
          - embedding: list[float] (512-dim vector)
          - bbox: [x1, y1, x2, y2]
          - det_score: float (detection confidence)
    """
    app = load_model()

    faces = app.get(image)

    if not faces:
        print("⚠️  No faces detected in image.")
        return []

    result = []
    for face in faces:
        result.append({
            "embedding":  face.embedding.tolist(),
            "bbox":       face.bbox.tolist(),
            "det_score":  float(face.det_score),
        })

    print(f"✅ Detected {len(result)} face(s) in image.")
    return result


def match_faces(
    detected_embeddings: list[dict],
    stored_students: list[dict],
    threshold: float = SIMILARITY_THRESHOLD
) -> list[dict]:
    """
    Match detected face embeddings against stored student embeddings.

    Args:
        detected_embeddings: output from extract_embeddings()
        stored_students: list of { "id": str, "embedding": list[float] }
        threshold: cosine similarity cutoff (0.0–1.0)

    Returns:
        List of matched student dicts: { "studentId": str, "similarity": float }
    """
    matched = []
    matched_ids = set()  # Prevent duplicate matches

    for detected in detected_embeddings:
        best_score    = -1.0
        best_student  = None

        for student in stored_students:
            stored_emb = student.get("embedding")

            # Skip if no embedding stored yet
            if not stored_emb:
                continue

            # Handle JSON-stringified embeddings from DB
            if isinstance(stored_emb, str):
                try:
                    import json
                    stored_emb = json.loads(stored_emb)
                except Exception:
                    continue

            score = cosine_similarity(detected["embedding"], stored_emb)

            if score > best_score:
                best_score   = score
                best_student = student

        # Accept match only if above threshold and not already matched
        if (
            best_student is not None
            and best_score >= threshold
            and best_student["id"] not in matched_ids
        ):
            matched_ids.add(best_student["id"])
            matched.append({
                "studentId":  best_student["id"],
                "similarity": round(best_score, 4),
            })
            print(f"✅ Matched student {best_student['id']} (similarity: {best_score:.4f})")

    if not matched:
        print("⚠️  No students matched above threshold.")

    return matched