import base64
import numpy as np
import cv2
from PIL import Image, ImageEnhance
import io


def decode_base64_image(base64_string: str) -> np.ndarray:
    """Decode base64 → OpenCV BGR array. Handles data URI prefix."""
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]
    image_bytes = base64.b64decode(base64_string)
    pil_image   = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    cv_image    = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    return cv_image


def preprocess_image(image: np.ndarray, max_width: int = 1280) -> np.ndarray:
    """
    Classroom-grade preprocessing:
    1. Resize to max 1280px wide (keeps aspect ratio)
    2. Normalize brightness (CLAHE)
    3. Denoise
    """
    h, w = image.shape[:2]

    # ── 1. Resize if too large ────────────────────────────────────────────────
    if w > max_width:
        scale  = max_width / w
        new_w  = max_width
        new_h  = int(h * scale)
        image  = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
        print(f"📐 Resized: {w}x{h} → {new_w}x{new_h}")

    # ── 2. Brightness normalization (CLAHE on L channel) ─────────────────────
    lab   = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l     = clahe.apply(l)
    lab   = cv2.merge((l, a, b))
    image = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

    # ── 3. Mild denoise ───────────────────────────────────────────────────────
    image = cv2.fastNlMeansDenoisingColored(image, None, 3, 3, 7, 21)

    return image


def cosine_similarity(a: list, b: list) -> float:
    """Cosine similarity between two embedding vectors."""
    a = np.array(a, dtype=np.float32)
    b = np.array(b, dtype=np.float32)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def image_to_base64(image_path: str) -> str:
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")