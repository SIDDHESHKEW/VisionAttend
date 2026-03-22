"""
test_recognize.py — Multi-face detection test
Tests 1 face, then checks engine info.
Run from vision-attend-ai/ with venv active:
    python test_recognize.py path/to/image.jpg
"""
import requests, base64, json, sys, os

IMAGE_PATH = sys.argv[1] if len(sys.argv) > 1 else "test_face.jpg"

if not os.path.exists(IMAGE_PATH):
    print(f"❌ Image not found: {IMAGE_PATH}")
    print("Usage: python test_recognize.py your_photo.jpg")
    exit(1)

with open(IMAGE_PATH, "rb") as f:
    b64 = base64.b64encode(f.read()).decode()

print(f"✅ Image: {IMAGE_PATH} ({len(b64):,} chars)")

# ── Health check ──────────────────────────────────────────────────────────────
try:
    info = requests.get("http://localhost:8000/").json()
    print(f"\n🔍 Engine:    {info['engine']}")
    print(f"🔍 Threshold: {info['threshold']}")
except Exception as e:
    print(f"❌ Server not running: {e}")
    exit(1)

# ── Test /embed ───────────────────────────────────────────────────────────────
print("\n📡 Testing /embed ...")
r = requests.post("http://localhost:8000/embed", json={"image": b64}, timeout=60)
print(f"Status: {r.status_code}")
if r.ok:
    d = r.json()
    print(f"✅ Faces detected: {d['facesDetected']}")
    print(f"✅ Embedding size: {len(d['embedding'])} dimensions")
    print(f"✅ Engine used:    {d['engine']}")
else:
    print(f"❌ {r.json()}")

# ── Test /recognize ───────────────────────────────────────────────────────────
print("\n📡 Testing /recognize ...")
r2 = requests.post("http://localhost:8000/recognize", json={
    "image":    b64,
    "students": [{"id": "test-student-001", "embedding": None}],
    "threshold": 0.4,
}, timeout=60)
print(f"Status: {r2.status_code}")
if r2.ok:
    d2 = r2.json()
    print(f"✅ Detected:  {d2['totalDetected']} face(s)")
    print(f"✅ Matched:   {d2['totalMatched']}")
    print(f"✅ Engine:    {d2['engine']}")
    print("\n✅ Multi-face robust detection working!")
else:
    print(f"❌ {r2.json()}")