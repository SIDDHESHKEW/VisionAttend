import { useState } from "react";
import Navbar from "../components/Navbar";
import API from "../services/api";

// Inline mini stat card — no icon, just text, fits 3 in a row on any screen
const StatPill = ({ label, value, color }) => {
  const colors = {
    blue:   "bg-blue-50 text-primary border-blue-100",
    green:  "bg-green-50 text-green-700 border-green-100",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
  };
  return (
    <div className={`flex-1 rounded-xl border p-3 text-center ${colors[color]}`}>
      <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
      <p className="font-bold text-sm mt-0.5" style={{ fontFamily: "Sora, sans-serif" }}>{value}</p>
    </div>
  );
};

const TeacherDashboard = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [subject, setSubject]             = useState("");
  const [image, setImage]                 = useState(null);
  const [imagePreview, setImagePreview]   = useState(null);
  const [loading, setLoading]             = useState(false);
  const [result, setResult]               = useState(null);
  const [error, setError]                 = useState("");
  const [report, setReport]               = useState(null);
  const [exportSubject, setExportSubject] = useState("Math");

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    if (file) setImagePreview(URL.createObjectURL(file));
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    if (!image || !subject) { setError("Please provide both image and subject."); return; }
    setLoading(true); setError(""); setResult(null);
    try {
      const formData = new FormData();
      formData.append("image", image);
      formData.append("subject", subject);
      const res = await API.post("/attendance/mark", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to mark attendance.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:5000/api/attendance/export?subject=${exportSubject}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) { setError("Export failed. No records found?"); return; }
      const blob = await res.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `attendance_${exportSubject}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Export failed: " + err.message);
    }
  };

  const fetchReport = async () => {
    try {
      const res = await API.get(`/attendance/report?subject=${exportSubject}`);
      setReport(res.data);
    } catch (err) {
      setError("Failed to fetch report.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      <Navbar role={user.role} />

      <div className="max-w-6xl mx-auto px-4 py-5">

        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: "Sora, sans-serif" }}>
            Teacher Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Welcome back, <span className="font-semibold text-primary">{user.name}</span> 👋
          </p>
        </div>

        {/* ── Stat Pills — always fits in one row ── */}
        <div className="flex gap-2 mb-5">
          <StatPill label="Role"   value="Teacher" color="blue"   />
          <StatPill label="System" value="Active"  color="green"  />
          <StatPill label="Export" value="Excel"   color="yellow" />
        </div>

        {/* ── Main content ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Mark Attendance card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"
                style={{ fontFamily: "Sora, sans-serif" }}>
              <span className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-white text-xs shrink-0">📸</span>
              Mark Attendance
            </h2>

            <form onSubmit={handleMarkAttendance} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Mathematics"
                  className="input-field text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Classroom Image</label>
                <div
                  className="border-2 border-dashed border-blue-200 rounded-xl p-4 text-center cursor-pointer hover:border-secondary transition-colors bg-blue-50/50"
                  onClick={() => document.getElementById("imageInput").click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-28 object-cover rounded-lg" />
                  ) : (
                    <>
                      <div className="text-2xl mb-1">🖼️</div>
                      <p className="text-xs text-gray-500">Tap to upload classroom photo</p>
                    </>
                  )}
                  <input id="imageInput" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-xl">
                  ⚠️ {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full btn-primary text-sm disabled:opacity-60">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Processing...
                  </span>
                ) : "📸 Mark Attendance"}
              </button>
            </form>

            {result && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="font-semibold text-green-700 text-sm mb-2">✅ Attendance Marked!</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-xs text-gray-400">Total</p>
                    <p className="font-bold text-gray-700">{result.total}</p>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-xs text-gray-400">Present</p>
                    <p className="font-bold text-green-600">{result.present}</p>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <p className="text-xs text-gray-400">Absent</p>
                    <p className="font-bold text-red-500">{result.absent}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Export + Report */}
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
                  <input
                    value={exportSubject}
                    onChange={(e) => setExportSubject(e.target.value)}
                    placeholder="e.g. Math"
                    className="input-field text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleExport} className="btn-secondary text-sm py-2">⬇️ Download</button>
                  <button onClick={fetchReport}  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-xl transition-all text-sm">
                    📋 Report
                  </button>
                </div>
              </div>
            </div>

            {report && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-bold text-gray-700 text-sm mb-3" style={{ fontFamily: "Sora, sans-serif" }}>
                  {report.total} records found
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
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
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