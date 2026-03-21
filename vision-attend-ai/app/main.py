from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np

from app.utils import decode_base64_image
from app.face_service import load_model, extract_embeddings, match_faces

# ─── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="VisionAttend AI Service",
    description="Face recognition microservice for attendance marking",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Pydantic Models ──────────────────────────────────────────────────────────

class StudentRecord(BaseModel):
    id: str
    embedding: Optional[List[float]] = None  # None if not registered yet


class RecognizeRequest(BaseModel):
    image: str                          # Base64 encoded classroom image
    students: List[StudentRecord]       # All students from DB
    threshold: Optional[float] = 0.5   # Similarity threshold


class RecognizeResponse(BaseModel):
    matchedStudents: List[dict]
    totalDetected: int
    totalMatched: int


class EmbedRequest(BaseModel):
    image: str   # Base64 face image for registration


class EmbedResponse(BaseModel):
    embedding: List[float]
    facesDetected: int


# ─── Startup: preload model ───────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    print("🚀 VisionAttend AI Service starting...")
    load_model()
    print("✅ AI Service Ready")


# ─── Health Check ─────────────────────────────────────────────────────────────
@app.get("/")
def health_check():
    return {
        "status":  "running",
        "service": "VisionAttend AI",
        "version": "1.0.0"
    }


# ─── POST /recognize ──────────────────────────────────────────────────────────
@app.post("/recognize", response_model=RecognizeResponse)
async def recognize(request: RecognizeRequest):
    """
    Detect faces in a classroom image and match against stored student embeddings.

    Flow:
    1. Decode base64 image
    2. Extract face embeddings from classroom photo
    3. Match each face against stored student embeddings
    4. Return matched student IDs
    """
    try:
        # 1. Decode image
        image = decode_base64_image(request.image)

        # 2. Extract embeddings from classroom photo
        detected = extract_embeddings(image)

        if not detected:
            return RecognizeResponse(
                matchedStudents=[],
                totalDetected=0,
                totalMatched=0
            )

        # 3. Filter students who have embeddings registered
        students_with_embeddings = [
            {"id": s.id, "embedding": s.embedding}
            for s in request.students
            if s.embedding is not None
        ]

        if not students_with_embeddings:
            return RecognizeResponse(
                matchedStudents=[],
                totalDetected=len(detected),
                totalMatched=0
            )

        # 4. Match faces
        matched = match_faces(
            detected_embeddings=detected,
            stored_students=students_with_embeddings,
            threshold=request.threshold
        )

        return RecognizeResponse(
            matchedStudents=matched,
            totalDetected=len(detected),
            totalMatched=len(matched)
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"❌ Recognition error: {e}")
        raise HTTPException(status_code=500, detail=f"Recognition failed: {str(e)}")


# ─── POST /embed ──────────────────────────────────────────────────────────────
@app.post("/embed", response_model=EmbedResponse)
async def embed(request: EmbedRequest):
    """
    Extract face embedding from a single face image.
    Used during student face registration (Phase 3).

    Returns a 512-dimensional embedding vector to store in DB.
    """
    try:
        image    = decode_base64_image(request.image)
        detected = extract_embeddings(image)

        if not detected:
            raise HTTPException(
                status_code=400,
                detail="No face detected in image. Please use a clear, front-facing photo."
            )

        # Use the highest-confidence face if multiple detected
        best_face = max(detected, key=lambda f: f["det_score"])

        return EmbedResponse(
            embedding=best_face["embedding"],
            facesDetected=len(detected)
        )

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"❌ Embedding error: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")