"""
face_service.py
───────────────
Dual-engine face detection:
  1. InsightFace (buffalo_l) — preferred, best for multi-face classrooms
  2. DeepFace  (Facenet512)  — fallback if InsightFace not installed

Automatically picks the best available engine on startup.
"""

import numpy as np
import cv2
from app.utils import cosine_similarity, preprocess_image

# ── Engine flags ──────────────────────────────────────────────────────────────
_engine       = None   # "insightface" | "deepface"
_face_app     = None   # InsightFace app
_deepface_ready = False

DET_SCORE_THRESHOLD  = 0.45   # minimum face detection confidence
SIMILARITY_THRESHOLD = 0.40   # cosine similarity for matching (lower = more lenient)
MODEL_NAME           = "Facenet512"


# ─────────────────────────────────────────────────────────────────────────────
# LOAD MODEL
# ─────────────────────────────────────────────────────────────────────────────
def load_model():
    global _engine, _face_app, _deepface_ready

    # ── Try InsightFace first ────────────────────────────────────────────────
    try:
        from insightface.app import FaceAnalysis
        print("🔄 Loading InsightFace buffalo_l model...")
        _face_app = FaceAnalysis(
            name="buffalo_l",
            providers=["CPUExecutionProvider"]
        )
        _face_app.prepare(ctx_id=0, det_size=(640, 640))
        _engine = "insightface"
        print("✅ Engine: InsightFace (buffalo_l) — classroom-grade multi-face detection")
        return

    except Exception as e:
        print(f"⚠️  InsightFace not available ({e}), falling back to DeepFace...")

    # ── Fallback: DeepFace ───────────────────────────────────────────────────
    try:
        from deepface import DeepFace
        DeepFace.build_model(MODEL_NAME)
        _engine       = "deepface"
        _deepface_ready = True
        print(f"✅ Engine: DeepFace ({MODEL_NAME}) — standard face detection")

    except Exception as e:
        print(f"❌ Neither engine loaded: {e}")
        _engine = None


# ─────────────────────────────────────────────────────────────────────────────
# EXTRACT EMBEDDINGS
# ─────────────────────────────────────────────────────────────────────────────
def extract_embeddings(image: np.ndarray) -> list[dict]:
    """
    Detect all faces and extract embeddings.
    Applies preprocessing automatically.
    Returns list of { embedding, bbox, det_score }
    """
    # Preprocess for better detection
    image = preprocess_image(image, max_width=1280)

    if _engine == "insightface":
        return _extract_insightface(image)
    elif _engine == "deepface":
        return _extract_deepface(image)
    else:
        raise RuntimeError("No face detection engine loaded.")


def _extract_insightface(image: np.ndarray) -> list[dict]:
    """InsightFace multi-face extraction — handles 30-50 faces."""
    faces = _face_app.get(image)
    print(f"🔍 InsightFace detected {len(faces)} face(s) (before filtering)")

    results = []
    for face in faces:
        score = float(face.det_score)

        if score < DET_SCORE_THRESHOLD:
            print(f"   ⏭️  Skipping low-confidence face (score: {score:.3f})")
            continue

        results.append({
            "embedding":  face.embedding.tolist(),
            "bbox":       face.bbox.tolist(),
            "det_score":  score,
        })

    print(f"✅ {len(results)} face(s) passed quality filter (threshold: {DET_SCORE_THRESHOLD})")
    return results


def _extract_deepface(image: np.ndarray) -> list[dict]:
    """DeepFace extraction — handles individual/small group images."""
    from deepface import DeepFace

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    try:
        results_raw = DeepFace.represent(
            img_path          = rgb,
            model_name        = MODEL_NAME,
            detector_backend  = "opencv",
            enforce_detection = False,
        )
    except Exception as e:
        print(f"❌ DeepFace error: {e}")
        return []

    print(f"🔍 DeepFace detected {len(results_raw)} face(s)")

    results = []
    for r in results_raw:
        score = float(r.get("face_confidence", 1.0))
        if score < DET_SCORE_THRESHOLD and score > 0:
            continue
        results.append({
            "embedding":  r["embedding"],
            "bbox":       r.get("facial_area", {}),
            "det_score":  score,
        })

    print(f"✅ {len(results)} face(s) passed quality filter")
    return results


# ─────────────────────────────────────────────────────────────────────────────
# MATCH FACES
# ─────────────────────────────────────────────────────────────────────────────
def match_faces(
    detected_embeddings: list[dict],
    stored_students: list[dict],
    threshold: float = SIMILARITY_THRESHOLD,
) -> list[dict]:
    """
    Match each detected face against stored student embeddings.
    Uses cosine similarity. Each student matched at most once.
    """
    matched     = []
    matched_ids = set()

    for i, detected in enumerate(detected_embeddings):
        best_score   = -1.0
        best_student = None

        for student in stored_students:
            stored_emb = student.get("embedding")
            if not stored_emb:
                continue

            # Parse JSON string if needed
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
            print(f"   ✅ Face #{i+1} → {best_student['id']} (similarity: {best_score:.4f})")
        else:
            reason = "below threshold" if best_score < threshold else "already matched"
            print(f"   ❌ Face #{i+1} → no match (best: {best_score:.4f}, {reason})")

    print(f"\n📊 Result: {len(matched)}/{len(detected_embeddings)} faces matched")
    return matched


# ─────────────────────────────────────────────────────────────────────────────
# HEALTH CHECK
# ─────────────────────────────────────────────────────────────────────────────
def get_engine_info() -> dict:
    return {
        "engine":    _engine or "none",
        "threshold": SIMILARITY_THRESHOLD,
        "det_score": DET_SCORE_THRESHOLD,
    }