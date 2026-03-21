import base64
import numpy as np
import cv2
from PIL import Image
import io


def decode_base64_image(base64_string: str) -> np.ndarray:
    """
    Decode a base64 image string into an OpenCV BGR numpy array.
    Handles optional data URI prefix e.g. 'data:image/jpeg;base64,...'
    """
    try:
        # Strip data URI prefix if present
        if "," in base64_string:
            base64_string = base64_string.split(",")[1]

        image_bytes = base64.b64decode(base64_string)
        pil_image   = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        cv_image    = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        return cv_image

    except Exception as e:
        raise ValueError(f"Failed to decode base64 image: {str(e)}")


def preprocess_image(image: np.ndarray, target_size: tuple = (640, 640)) -> np.ndarray:
    """
    Resize image for model input while preserving aspect ratio.
    Pads with black if needed.
    """
    h, w = image.shape[:2]
    scale = min(target_size[0] / h, target_size[1] / w)

    new_w = int(w * scale)
    new_h = int(h * scale)

    resized = cv2.resize(image, (new_w, new_h))

    # Pad to target size
    padded = np.zeros((target_size[0], target_size[1], 3), dtype=np.uint8)
    padded[:new_h, :new_w] = resized

    return padded


def image_to_base64(image_path: str) -> str:
    """
    Convert an image file on disk to a base64 string.
    Used by Node.js aiService.js integration.
    """
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def cosine_similarity(a: list, b: list) -> float:
    """
    Compute cosine similarity between two embedding vectors.
    Returns value between -1 and 1 (1 = identical).
    """
    a = np.array(a, dtype=np.float32)
    b = np.array(b, dtype=np.float32)

    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return float(np.dot(a, b) / (norm_a * norm_b))