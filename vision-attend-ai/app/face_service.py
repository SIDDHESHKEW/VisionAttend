import numpy as np
import cv2
from deepface import DeepFace
from app.utils import cosine_similarity

SIMILARITY_THRESHOLD = 0.5
MODEL_NAME = "Facenet512"   # Best accuracy/speed balance


def load_model():
    """Warm up DeepFace model on startup."""
    print("🤖 Loading DeepFace model (Facenet512)...")
    try:
        # Trigger model download/load
        DeepFace.build_model(MODEL_NAME)
        print("✅ DeepFace model loaded successfully.")
    except Exception as e:
        print(f"⚠️  Model preload warning (will load on first request): {e}")


def extract_embeddings(image: np.ndarray) -> list[dict]:
    """
    Detect all faces in image and extract 512-dim embeddings.
    Returns list of { embedding, bbox, det_score }
    """
    try:
        # DeepFace expects RGB — convert from BGR
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        results = DeepFace.represent(
            img_path      = rgb_image,
            model_name    = MODEL_NAME,
            detector_backend = "opencv",   # fast; use "retinaface" for accuracy
            enforce_detection = False,
        )

        if not results:
            print("⚠️  No faces detected.")
            return []

        faces = []
        for r in results:
            faces.append({
                "embedding":  r["embedding"],
                "bbox":       r.get("facial_area", {}),
                "det_score":  r.get("face_confidence", 1.0),
            })

        print(f"✅ Detected {len(faces)} face(s).")
        return faces

    except Exception as e:
        print(f"❌ extract_embeddings error: {e}")
        return []


def match_faces(
    detected_embeddings: list[dict],
    stored_students: list[dict],
    threshold: float = SIMILARITY_THRESHOLD
) -> list[dict]:
    """
    Match detected embeddings against stored student embeddings.
    Returns list of { studentId, similarity }
    """
    matched    = []
    matched_ids = set()

    for detected in detected_embeddings:
        best_score   = -1.0
        best_student = None

        for student in stored_students:
            stored_emb = student.get("embedding")
            if not stored_emb:
                continue

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
            print(f"✅ Matched: {best_student['id']} (score: {best_score:.4f})")

    if not matched:
        print("⚠️  No students matched above threshold.")

    return matched