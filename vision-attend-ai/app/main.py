from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from app.utils import decode_base64_image
from app.face_service import (
    load_model,
    extract_embeddings,
    match_faces,
    get_engine_info,
    SIMILARITY_THRESHOLD,
)

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="VisionAttend AI Service",
    description="Multi-face classroom attendance recognition",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Models ───────────────────────────────────────────────────────────────────
class StudentRecord(BaseModel):
    id: str
    embedding: Optional[List[float]] = None

class RecognizeRequest(BaseModel):
    image: str
    students: List[StudentRecord]
    threshold: Optional[float] = SIMILARITY_THRESHOLD

class RecognizeResponse(BaseModel):
    matchedStudents: List[dict]
    totalDetected: int
    totalMatched: int
    engine: str

class EmbedRequest(BaseModel):
    image: str

class EmbedResponse(BaseModel):
    embedding: List[float]
    facesDetected: int
    engine: str

# ─── Startup ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    print("\n🚀 VisionAttend AI Service v2.0 starting...")
    load_model()
    info = get_engine_info()
    print(f"✅ AI Service Ready | Engine: {info['engine']} | Threshold: {info['threshold']}\n")

# ─── Health ───────────────────────────────────────────────────────────────────
@app.get("/")
def health_check():
    info = get_engine_info()
    return {
        "status":    "running",
        "service":   "VisionAttend AI",
        "version":   "2.0.0",
        "engine":    info["engine"],
        "threshold": info["threshold"],
    }

# ─── POST /embed ──────────────────────────────────────────────────────────────
@app.post("/embed", response_model=EmbedResponse)
async def embed(request: EmbedRequest):
    """Extract face embedding for student registration."""
    try:
        image    = decode_base64_image(request.image)
        detected = extract_embeddings(image)

        if not detected:
            raise HTTPException(
                status_code=400,
                detail="No face detected — adjust lighting or move closer to camera."
            )

        # Use highest-confidence face
        best = max(detected, key=lambda f: f["det_score"])
        info = get_engine_info()

        return EmbedResponse(
            embedding=best["embedding"],
            facesDetected=len(detected),
            engine=info["engine"],
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Embed error: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")


# ─── POST /recognize ──────────────────────────────────────────────────────────
@app.post("/recognize", response_model=RecognizeResponse)
async def recognize(request: RecognizeRequest):
    """
    Detect ALL faces in classroom image and match against stored embeddings.
    Supports 30-50 faces in a single image.
    """
    try:
        print(f"\n📸 /recognize — {len(request.students)} students to match against")
        image    = decode_base64_image(request.image)
        detected = extract_embeddings(image)

        if not detected:
            info = get_engine_info()
            return RecognizeResponse(
                matchedStudents=[],
                totalDetected=0,
                totalMatched=0,
                engine=info["engine"],
            )

        # Filter students with valid embeddings
        students_with_embeddings = [
            {"id": s.id, "embedding": s.embedding}
            for s in request.students
            if s.embedding is not None and len(s.embedding) > 0
        ]

        print(f"👥 {len(students_with_embeddings)}/{len(request.students)} students have embeddings")

        if not students_with_embeddings:
            info = get_engine_info()
            return RecognizeResponse(
                matchedStudents=[],
                totalDetected=len(detected),
                totalMatched=0,
                engine=info["engine"],
            )

        matched = match_faces(
            detected_embeddings=detected,
            stored_students=students_with_embeddings,
            threshold=request.threshold,
        )

        info = get_engine_info()
        return RecognizeResponse(
            matchedStudents=matched,
            totalDetected=len(detected),
            totalMatched=len(matched),
            engine=info["engine"],
        )

    except Exception as e:
        print(f"❌ Recognize error: {e}")
        raise HTTPException(status_code=500, detail=f"Recognition failed: {str(e)}")