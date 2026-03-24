import numpy as np
import cv2
import json
from app.utils import cosine_similarity, preprocess_image

_engine   = None
_face_app = None

DET_SCORE_THRESHOLD  = 0.45
SIMILARITY_THRESHOLD = 0.40


def load_model():
    global _engine, _face_app
    try:
        from insightface.app import FaceAnalysis
        print("🔄 Loading InsightFace buffalo_l...")
        _face_app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
        _face_app.prepare(ctx_id=0, det_size=(640, 640))
        _engine = "insightface"
        print("✅ Engine: InsightFace (buffalo_l)")
        return
    except Exception as e:
        print(f"⚠️  InsightFace unavailable: {e}")
    try:
        from deepface import DeepFace
        DeepFace.build_model("Facenet512")
        _engine = "deepface"
        print("✅ Engine: DeepFace (Facenet512) fallback")
    except Exception as e:
        print(f"❌ No engine: {e}")
        _engine = None


def extract_embeddings(image: np.ndarray) -> list[dict]:
    image = preprocess_image(image, max_width=1280)
    if _engine == "insightface":
        return _extract_insightface(image)
    elif _engine == "deepface":
        return _extract_deepface(image)
    else:
        raise RuntimeError("No face detection engine loaded.")


def _extract_insightface(image: np.ndarray) -> list[dict]:
    faces = _face_app.get(image)
    print(f"🔍 InsightFace detected {len(faces)} face(s)")
    results = []
    for face in faces:
        score = float(face.det_score)
        if score < DET_SCORE_THRESHOLD:
            continue
        results.append({"embedding": face.embedding.tolist(), "bbox": face.bbox.tolist(), "det_score": score})
    print(f"✅ {len(results)} passed filter")
    return results


def _extract_deepface(image: np.ndarray) -> list[dict]:
    from deepface import DeepFace
    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    try:
        raw = DeepFace.represent(img_path=rgb, model_name="Facenet512",
            detector_backend="opencv", enforce_detection=False)
    except Exception as e:
        print(f"❌ DeepFace error: {e}")
        return []
    results = []
    for r in raw:
        score = float(r.get("face_confidence", 1.0))
        if score < DET_SCORE_THRESHOLD and score > 0:
            continue
        results.append({"embedding": r["embedding"], "bbox": r.get("facial_area", {}), "det_score": score})
    print(f"✅ DeepFace: {len(results)} face(s)")
    return results


def match_faces(detected_embeddings, stored_students, threshold=SIMILARITY_THRESHOLD):
    matched     = []
    matched_ids = set()

    for i, detected in enumerate(detected_embeddings):
        best_score   = -1.0
        best_student = None

        for student in stored_students:
            raw_emb = student.get("embedding")
            if not raw_emb:
                continue
            if isinstance(raw_emb, str):
                try:
                    raw_emb = json.loads(raw_emb)
                except Exception:
                    continue

            # Support single OR multiple embeddings
            if isinstance(raw_emb[0], list):
                embeddings_list = raw_emb
            else:
                embeddings_list = [raw_emb]

            max_sim = max(cosine_similarity(detected["embedding"], emb) for emb in embeddings_list)

            if max_sim > best_score:
                best_score   = max_sim
                best_student = student

        if best_student and best_score >= threshold and best_student["id"] not in matched_ids:
            matched_ids.add(best_student["id"])
            matched.append({"studentId": best_student["id"], "similarity": round(best_score, 4)})
            print(f"   ✅ Face #{i+1} → {best_student['id']} (sim: {best_score:.4f})")
        else:
            print(f"   ❌ Face #{i+1} no match (best: {best_score:.4f})")

    print(f"📊 {len(matched)}/{len(detected_embeddings)} matched")
    return matched


def get_engine_info():
    return {"engine": _engine or "none", "threshold": SIMILARITY_THRESHOLD, "det_score": DET_SCORE_THRESHOLD}