import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import API from "../services/api";

const StatCard = ({ label, value, icon, color }) => {
  const colorMap = {
    blue:   "bg-blue-50 text-primary border-blue-100",
    green:  "bg-green-50 text-green-700 border-green-100",
    red:    "bg-red-50 text-red-600 border-red-100",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
  };
  return (
    <div className={`rounded-2xl border p-4 flex items-center gap-3 ${colorMap[color]}`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold" style={{ fontFamily: "Sora, sans-serif" }}>{value}</p>
      </div>
    </div>
  );
};

const StudentDashboard = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  useEffect(() => {
    API.get("/attendance/my")
      .then((res) => setAttendance(res.data))
      .catch(() => setError("Could not load attendance data."))
      .finally(() => setLoading(false));
  }, []);

  const pct      = parseFloat(attendance?.attendancePercentage || "0");
  const pctColor = pct >= 75 ? "green" : pct >= 50 ? "yellow" : "red";
  const barColor = pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-yellow-400" : "bg-red-500";

  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      <Navbar role={user.role} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: "Sora, sans-serif" }}>
            Student Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Welcome, <span className="font-semibold text-primary">{user.name}</span> 👋
            {user.rollNumber && <span className="ml-2 text-gray-400">• Roll: {user.rollNumber}</span>}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <svg className="animate-spin w-8 h-8 text-primary mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              <p className="text-gray-400 text-sm">Loading attendance...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <StatCard label="Total Classes" value={attendance?.total   || 0} icon="📅" color="blue"   />
              <StatCard label="Present"       value={attendance?.present || 0} icon="✅" color="green"  />
              <StatCard label="Absent"        value={attendance?.absent  || 0} icon="❌" color="red"    />
              <StatCard label="Attendance %"  value={attendance?.attendancePercentage || "0%"} icon="📈" color={pctColor} />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-700" style={{ fontFamily: "Sora, sans-serif" }}>Attendance Overview</h2>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  pct >= 75 ? "bg-green-100 text-green-700" : pct >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"
                }`}>{attendance?.attendancePercentage || "0%"}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div className={`h-3 rounded-full transition-all duration-700 ${barColor}`}
                  style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {pct >= 75 ? "✅ Great attendance! Keep it up."
                  : pct >= 50 ? "⚠️ Below recommended level."
                  : "🚨 Critical — attendance very low."}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-700" style={{ fontFamily: "Sora, sans-serif" }}>Attendance History</h2>
              </div>

              {error && <div className="px-5 py-3 text-red-600 text-sm">⚠️ {error}</div>}

              {attendance?.records?.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-sm">No records yet.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-5 py-3 text-gray-500 font-medium">Subject</th>
                      <th className="text-left px-5 py-3 text-gray-500 font-medium">Date</th>
                      <th className="text-left px-5 py-3 text-gray-500 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance?.records?.map((rec) => (
                      <tr key={rec.id} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-700">{rec.subject}</td>
                        <td className="px-5 py-3 text-gray-500">{rec.date}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            rec.status === "Present" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                          }`}>
                            {rec.status === "Present" ? "✓ Present" : "✗ Absent"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        <p className="text-xs text-gray-400 text-center mt-8">Created by Siddhesh Kewate, IBM Btech</p>
      </div>
    </div>
  );
};

export default StudentDashboard;