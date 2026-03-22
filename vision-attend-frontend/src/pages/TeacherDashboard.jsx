import { useState, useRef, useEffect } from "react";
import Navbar from "../components/Navbar";
import API from "../services/api";

// ── Inline Camera Hook ────────────────────────────────────────────────────────
const useCamera = () => {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [on, setOn] = useState(false);
  const [err, setErr] = useState("");

  const start = async () => {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setOn(true);
    } catch { setErr("Camera access denied."); }
  };

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setOn(false);
  };

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const canvas = canvasRef.current;
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.85);
  };

  useEffect(() => () => stop(), []);
  return { videoRef, canvasRef, on, err, start, stop, capture };
};

// ── Stat Pill ─────────────────────────────────────────────────────────────────
const Pill = ({ label, value, color }) => {
  const c = {
    blue:   "bg-blue-100 text-blue-800 border-blue-400",
    green:  "bg-green-100 text-green-700 border-green-400",
    red:    "bg-red-100 text-red-700 border-red-400",
    yellow: "bg-yellow-100 text-yellow-700 border-yellow-400",
  }[color] || "bg-gray-100 text-gray-700 border-gray-300";

  return (
    <div className={`flex-1 rounded-xl border-2 p-3 text-center shadow-md hover:scale-105 transition-transform ${c}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="font-bold text-lg" style={{ fontFamily: "Sora, sans-serif" }}>{value}</p>
    </div>
  );
};

const TeacherDashboard = () => {
  const user    = JSON.parse(localStorage.getItem("user") || "{}");
  const cam     = useCamera();

  // Form state
  const [subject, setSubject]           = useState("");
  const [exportSubject, setExportSubject] = useState("Math");
  const [captureMode, setCaptureMode]   = useState("upload"); // "upload" | "camera"
  const [imageFile, setImageFile]       = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [cameraSnapshot, setCameraSnapshot] = useState(null);

  // Flow state
  const [stage, setStage]           = useState("input");    // input | previewing | confirmed
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [result, setResult]         = useState(null);

  // Preview state
  const [previewData, setPreviewData]       = useState(null);
  const [presentList, setPresentList]       = useState([]);  // editable
  const [allStudents, setAllStudents]       = useState([]);
  const [addStudentId, setAddStudentId]     = useState("");

  // Report state
  const [report, setReport] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    setCameraSnapshot(null);
    if (file) setImagePreview(URL.createObjectURL(file));
  };

  const handleCameraCapture = () => {
    const dataUrl = cam.capture();
    if (!dataUrl) return;
    setCameraSnapshot(dataUrl);
    setImageFile(null);
    setImagePreview(dataUrl);
    cam.stop();
  };

  // ── Step 1: Preview (no DB save) ──────────────────────────────────────────
  const handlePreview = async (e) => {
    e.preventDefault();
    if (!subject) { setError("Please enter a subject."); return; }
    if (!imageFile && !cameraSnapshot) { setError("Please upload or capture a classroom image."); return; }

    setLoading(true); setError(""); setPreviewData(null);

    try {
      const formData = new FormData();
      formData.append("subject", subject);

      if (imageFile) {
        formData.append("image", imageFile);
      } else {
        // Convert base64 snapshot to File
        const res  = await fetch(cameraSnapshot);
        const blob = await res.blob();
        formData.append("image", blob, "snapshot.jpg");
      }

      const response = await API.post("/attendance/preview", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = response.data;
      setPreviewData(data);
      setPresentList(data.detectedStudents);
      setAllStudents(data.allStudents);
      setStage("previewing");
    } catch (err) {
      setError(err.response?.data?.message || "Preview failed.");
    } finally {
      setLoading(false);
    }
  };

  // ── Remove from present list ──────────────────────────────────────────────
  const removeStudent = (id) => {
    setPresentList(presentList.filter((s) => s.id !== id));
  };

  // ── Add student manually ──────────────────────────────────────────────────
  const addStudent = () => {
    if (!addStudentId) return;
    if (presentList.find((s) => s.id === addStudentId)) return;
    const student = allStudents.find((s) => s.id === addStudentId);
    if (student) {
      setPresentList([...presentList, { ...student, similarity: 1.0, manual: true }]);
      setAddStudentId("");
    }
  };

  // ── Step 2: Confirm & Save ────────────────────────────────────────────────
  const handleConfirm = async () => {
    setLoading(true); setError("");
    try {
      const response = await API.post("/attendance/mark-final", {
        studentIds: presentList.map((s) => s.id),
        subject,
      });
      setResult(response.data);
      setStage("confirmed");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save attendance.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStage("input"); setPreviewData(null); setPresentList([]);
    setImageFile(null); setImagePreview(null); setCameraSnapshot(null);
    setResult(null); setError(""); setSubject("");
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/attendance/export?subject=${exportSubject}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setError("Export failed."); return; }
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `attendance_${exportSubject}.xlsx`; a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) { setError("Export error: " + err.message); }
  };

  const fetchReport = async () => {
    try {
      const res = await API.get(`/attendance/report?subject=${exportSubject}`);
      setReport(res.data);
    } catch { setError("Failed to fetch report."); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      <Navbar role={user.role} />
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: "Sora, sans-serif" }}>
            Teacher Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Welcome back, <span className="font-semibold text-primary">{user.name}</span> 👋
          </p>
        </div>

        {/* Stat Pills */}
        <div className="flex gap-2 mb-6">
          <Pill label="Role"    value="Teacher" color="blue"   />
          <Pill label="System"  value="Active"  color="green"  />
          <Pill label="Mode"    value="AI+Verify" color="yellow" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ── LEFT: Mark Attendance ── */}
          <div className="space-y-4">

            {/* Stage: Input */}
            {stage === "input" && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"
                    style={{ fontFamily: "Sora, sans-serif" }}>
                  <span className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-white text-xs shrink-0">📸</span>
                  Mark Attendance
                </h2>

                <form onSubmit={handlePreview} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                    <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics" className="input-field text-sm" required />
                  </div>

                  {/* Capture mode toggle */}
                  <div className="flex gap-2">
                    {["upload", "camera"].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => { setCaptureMode(mode); setImagePreview(null); setImageFile(null); setCameraSnapshot(null); cam.stop(); }}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all border ${
                          captureMode === mode
                            ? "bg-primary text-white border-primary"
                            : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {mode === "upload" ? "📁 Upload File" : "📷 Live Camera"}
                      </button>
                    ))}
                  </div>

                  {/* Upload mode */}
                  {captureMode === "upload" && (
                    <div
                      className="border-2 border-dashed border-blue-200 rounded-xl p-4 text-center cursor-pointer hover:border-secondary transition-colors bg-blue-50/50"
                      onClick={() => document.getElementById("classImg").click()}
                    >
                      {imagePreview ? (
                        <img src={imagePreview} alt="preview" className="w-full h-28 object-cover rounded-lg" />
                      ) : (
                        <><div className="text-2xl mb-1">🖼️</div><p className="text-xs text-gray-500">Click to upload classroom photo</p></>
                      )}
                      <input id="classImg" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </div>
                  )}

                  {/* Camera mode */}
                  {captureMode === "camera" && (
                    <div className="space-y-2">
                      <div className="bg-gray-900 rounded-xl overflow-hidden" style={{ minHeight: "180px" }}>
                        <video ref={cam.videoRef} autoPlay playsInline muted
                          className={`w-full rounded-xl ${cam.on ? "block" : "hidden"}`}
                          style={{ maxHeight: "180px", objectFit: "cover" }} />
                        <canvas ref={cam.canvasRef} className="hidden" />
                        {!cam.on && !cameraSnapshot && (
                          <div className="flex items-center justify-center h-44 text-gray-400">
                            <div className="text-center"><div className="text-3xl mb-1">📷</div><p className="text-xs">Camera off</p></div>
                          </div>
                        )}
                        {cameraSnapshot && !cam.on && (
                          <img src={cameraSnapshot} alt="snapshot" className="w-full rounded-xl" style={{ maxHeight: "180px", objectFit: "cover" }} />
                        )}
                      </div>
                      {cam.err && <p className="text-xs text-red-500">{cam.err}</p>}
                      <div className="flex gap-2">
                        {!cam.on ? (
                          <button type="button" onClick={cam.start} className="flex-1 bg-primary text-white text-xs font-semibold py-2 rounded-xl">
                            📷 Open Camera
                          </button>
                        ) : (
                          <>
                            <button type="button" onClick={handleCameraCapture} className="flex-1 bg-green-600 text-white text-xs font-semibold py-2 rounded-xl">
                              📸 Capture
                            </button>
                            <button type="button" onClick={cam.stop} className="bg-gray-200 text-gray-700 text-xs font-semibold px-4 rounded-xl">
                              Stop
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-xl">⚠️ {error}</div>}

                  <button type="submit" disabled={loading} className="w-full btn-primary text-sm disabled:opacity-60">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                        AI Detecting Faces...
                      </span>
                    ) : "🔍 Detect & Preview"}
                  </button>
                </form>
              </div>
            )}

            {/* Stage: Preview */}
            {stage === "previewing" && previewData && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-gray-800" style={{ fontFamily: "Sora, sans-serif" }}>
                    🔍 AI Preview — Verify Results
                  </h2>
                  <button onClick={handleReset} className="text-xs text-gray-400 hover:text-gray-600 underline">Reset</button>
                </div>

                {/* Summary pills */}
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 bg-green-50 border border-green-300 rounded-xl p-2 text-center">
                    <p className="text-xs text-gray-500">Detected</p>
                    <p className="font-bold text-green-700">{presentList.length}</p>
                  </div>
                  <div className="flex-1 bg-red-50 border border-red-300 rounded-xl p-2 text-center">
                    <p className="text-xs text-gray-500">Absent</p>
                    <p className="font-bold text-red-600">{previewData.totalStudents - presentList.length}</p>
                  </div>
                  <div className="flex-1 bg-blue-50 border border-blue-300 rounded-xl p-2 text-center">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="font-bold text-primary">{previewData.totalStudents}</p>
                  </div>
                </div>

                {/* Detected students list */}
                <p className="text-xs font-semibold text-gray-600 mb-2">✅ Marked as Present:</p>
                <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                  {presentList.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-4">No students detected. Add manually below.</p>
                  )}
                  {presentList.map((s) => (
                    <div key={s.id} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{s.name}</p>
                        <p className="text-xs text-gray-400">
                          Roll: {s.rollNumber || "—"}
                          {s.manual ? " • ➕ Added manually" : ` • 🤖 AI ${Math.round((s.similarity || 0) * 100)}% match`}
                        </p>
                      </div>
                      <button onClick={() => removeStudent(s.id)} className="text-red-400 hover:text-red-600 text-lg font-bold leading-none">×</button>
                    </div>
                  ))}
                </div>

                {/* Add student manually */}
                <p className="text-xs font-semibold text-gray-600 mb-2">➕ Add Student Manually:</p>
                <div className="flex gap-2 mb-4">
                  <select
                    value={addStudentId}
                    onChange={(e) => setAddStudentId(e.target.value)}
                    className="input-field text-xs flex-1"
                  >
                    <option value="">Select student...</option>
                    {allStudents
                      .filter((s) => !presentList.find((p) => p.id === s.id))
                      .map((s) => (
                        <option key={s.id} value={s.id}>{s.name} {s.rollNumber ? `(Roll: ${s.rollNumber})` : ""}</option>
                      ))}
                  </select>
                  <button onClick={addStudent} className="bg-primary text-white text-xs font-semibold px-4 rounded-xl hover:bg-blue-900 transition-all">
                    Add
                  </button>
                </div>

                {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-xl mb-3">⚠️ {error}</div>}

                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-all text-sm shadow-md disabled:opacity-60"
                >
                  {loading ? "Saving..." : "✅ Confirm & Mark Attendance"}
                </button>
              </div>
            )}

            {/* Stage: Confirmed */}
            {stage === "confirmed" && result && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">🎉</div>
                  <h2 className="text-base font-bold text-green-700" style={{ fontFamily: "Sora, sans-serif" }}>Attendance Saved!</h2>
                  <p className="text-xs text-gray-500">{result.subject} • {result.date}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-blue-50 border border-blue-300 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="font-bold text-primary text-xl">{result.total}</p>
                  </div>
                  <div className="bg-green-50 border border-green-300 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500">Present</p>
                    <p className="font-bold text-green-700 text-xl">{result.present}</p>
                  </div>
                  <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500">Absent</p>
                    <p className="font-bold text-red-600 text-xl">{result.absent}</p>
                  </div>
                </div>
                <button onClick={handleReset} className="w-full btn-primary text-sm">
                  ➕ Mark Another Class
                </button>
              </div>
            )}
          </div>

          {/* ── RIGHT: Export + Report ── */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"
                  style={{ fontFamily: "Sora, sans-serif" }}>
                <span className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center text-white text-xs shrink-0">📊</span>
                Export to Excel
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                  <input value={exportSubject} onChange={(e) => setExportSubject(e.target.value)} placeholder="e.g. Math" className="input-field text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleExport} className="btn-secondary text-sm py-2">⬇️ Download</button>
                  <button onClick={fetchReport}  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-xl transition-all text-sm">📋 Report</button>
                </div>
              </div>
            </div>

            {report && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-bold text-gray-700 text-sm mb-3" style={{ fontFamily: "Sora, sans-serif" }}>
                  {report.total} records
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-3 py-2 text-gray-500 font-medium">Name</th>
                        <th className="text-left px-3 py-2 text-gray-500 font-medium">Roll</th>
                        <th className="text-left px-3 py-2 text-gray-500 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.records.map((rec) => (
                        <tr key={rec.id} className="border-t border-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-700">{rec.User?.name}</td>
                          <td className="px-3 py-2 text-gray-500">{rec.User?.rollNumber || "—"}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                              rec.status === "Present" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                            }`}>
                              {rec.status === "Present" ? "✓" : "✗"} {rec.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-8">Created by Siddhesh Kewate, IBM Btech</p>
      </div>
    </div>
  );
};

export default TeacherDashboard;