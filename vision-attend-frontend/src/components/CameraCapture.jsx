import { useState, useRef, useEffect } from "react";

const CameraCapture = ({ onCapture, minCaptures = 1, maxCaptures = 3 }) => {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [captures, setCaptures]     = useState([]);
  const [cameraOn, setCameraOn]     = useState(false);
  const [error, setError]           = useState("");
  const [validating, setValidating] = useState(false);
  const [faceStatus, setFaceStatus] = useState([]);

  const startCamera = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      });
      streamRef.current          = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraOn(true);
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  };

  // Manual capture only — NO auto-capture loops
  const capturePhoto = async () => {
    if (!videoRef.current || captures.length >= maxCaptures) return;

    const canvas  = canvasRef.current;
    const ctx     = canvas.getContext("2d");
    canvas.width  = videoRef.current.videoWidth  || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    const base64 = canvas.toDataURL("image/jpeg", 0.9).split(",")[1];

    setValidating(true);
    const hasFace = await checkFace(base64);
    setValidating(false);

    const newCaptures   = [...captures, base64];
    const newFaceStatus = [...faceStatus, hasFace];
    setCaptures(newCaptures);
    setFaceStatus(newFaceStatus);
    onCapture(newCaptures, newFaceStatus);
    setError(hasFace ? "" : "No face detected. Try better lighting or move closer.");
  };

  const checkFace = async (base64) => {
    try {
      const res = await fetch("http://localhost:8000/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
        signal: AbortSignal.timeout(8000),
      });
      return res.ok;
    } catch {
      return true; // allow if AI unreachable
    }
  };

  const removeCapture = (index) => {
    const c = captures.filter((_, i) => i !== index);
    const f = faceStatus.filter((_, i) => i !== index);
    setCaptures(c);
    setFaceStatus(f);
    onCapture(c, f);
    setError("");
  };

  useEffect(() => () => stopCamera(), []);

  const validCount = captures.filter((_, i) => faceStatus[i] === true).length;
  const isReady    = validCount >= minCaptures;

  return (
    <div className="space-y-3">
      <div className="relative bg-gray-900 rounded-xl overflow-hidden" style={{ minHeight: "180px" }}>
        <video ref={videoRef} autoPlay playsInline muted
          className={`w-full rounded-xl ${cameraOn ? "block" : "hidden"}`}
          style={{ maxHeight: "210px", objectFit: "cover" }} />
        <canvas ref={canvasRef} className="hidden" />

        {!cameraOn && (
          <div className="flex flex-col items-center justify-center h-44 text-gray-400">
            <span className="text-4xl mb-2">📷</span>
            <p className="text-sm">Camera is off</p>
          </div>
        )}

        {cameraOn && (
          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
            {captures.length}/{maxCaptures}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {!cameraOn ? (
          <button type="button" onClick={startCamera}
            className="flex-1 bg-primary hover:bg-blue-900 text-white text-sm font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2">
            📷 Open Camera
          </button>
        ) : (
          <>
            <button type="button" onClick={capturePhoto}
              disabled={captures.length >= maxCaptures || validating}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {validating ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Checking...
                </>
              ) : <>📸 Capture ({captures.length}/{maxCaptures})</>}
            </button>
            <button type="button" onClick={stopCamera}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold px-4 rounded-xl transition-all">
              Stop
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-xl">{error}</div>
      )}

      {captures.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 font-medium mb-2">Captured Photos:</p>
          <div className="flex gap-2 flex-wrap">
            {captures.map((b64, i) => (
              <div key={i} className="relative">
                <img src={`data:image/jpeg;base64,${b64}`} alt={`cap-${i}`}
                  className={`w-16 h-16 object-cover rounded-lg border-2 ${faceStatus[i] ? "border-green-400" : "border-red-400"}`} />
                <span className={`absolute -top-1 -right-1 text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold ${faceStatus[i] ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                  {faceStatus[i] ? "✓" : "✗"}
                </span>
                <button type="button" onClick={() => removeCapture(i)}
                  className="absolute -bottom-1 -right-1 bg-gray-700 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center hover:bg-red-600">
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-2 ${
        isReady ? "bg-green-50 text-green-700 border border-green-200" : "bg-yellow-50 text-yellow-700 border border-yellow-200"
      }`}>
        {isReady
          ? <>✅ Ready! {validCount} valid photo{validCount > 1 ? "s" : ""}</>
          : <>📸 Need {minCaptures - validCount} more valid photo{minCaptures - validCount > 1 ? "s" : ""}</>}
      </div>
    </div>
  );
};

export default CameraCapture;