import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Card from "../components/Card";
import API from "../services/api";

const StudentDashboard = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await API.get("/attendance/my");
        setAttendance(res.data);
      } catch (err) {
        setError("Could not load attendance data.");
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, []);

  const percentage = attendance?.attendancePercentage || "0%";
  const pctNum     = parseFloat(percentage);
  const pctColor   = pctNum >= 75 ? "green" : pctNum >= 50 ? "yellow" : "red";

  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      <Navbar role={user.role} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800" style={{ fontFamily: "Sora, sans-serif" }}>
            Student Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
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
            {/* 4 stat cards in 2x2 grid on mobile */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <Card title="Total Classes" value={attendance?.total   || 0} icon="📅" color="blue" />
              <Card title="Present"       value={attendance?.present || 0} icon="✅" color="green" />
              <Card title="Absent"        value={attendance?.absent  || 0} icon="❌" color="red" />
              <Card title="Attendance %"  value={percentage}               icon="📈" color={pctColor} />
            </div>

            {/* Progress bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-700 text-sm" style={{ fontFamily: "Sora, sans-serif" }}>Attendance Overview</h2>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  pctNum >= 75 ? "bg-green-100 text-green-700" :
                  pctNum >= 50 ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-600"
                }`}>{percentage}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ${
                    pctNum >= 75 ? "bg-green-500" : pctNum >= 50 ? "bg-yellow-400" : "bg-red-500"
                  }`}
                  style={{ width: `${Math.min(pctNum, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {pctNum >= 75 ? "✅ Great attendance! Keep it up." :
                 pctNum >= 50 ? "⚠️ Attendance below recommended level." :
                 "🚨 Critical! Attendance is very low."}
              </p>
            </div>

            {/* Records table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-bold text-gray-700 text-sm mb-4" style={{ fontFamily: "Sora, sans-serif" }}>Attendance History</h2>

              {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-xl mb-3">⚠️ {error}</div>}

              {attendance?.records?.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-sm">No attendance records yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-3 py-2.5 text-gray-500 font-medium rounded-l-lg">Subject</th>
                        <th className="text-left px-3 py-2.5 text-gray-500 font-medium">Date</th>
                        <th className="text-left px-3 py-2.5 text-gray-500 font-medium rounded-r-lg">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance?.records?.map((rec) => (
                        <tr key={rec.id} className="border-t border-gray-50">
                          <td className="px-3 py-2.5 font-medium text-gray-700">{rec.subject}</td>
                          <td className="px-3 py-2.5 text-gray-500">{rec.date}</td>
                          <td className="px-3 py-2.5">
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
                </div>
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