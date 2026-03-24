import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Calendar, TrendingUp, BookOpen } from "lucide-react";
import Navbar from "../components/Navbar";
import API from "../services/api";

const StatCard = ({ label, value, icon: Icon, iconColor, bg, border, textColor }) => (
  <div className={`rounded-2xl border-2 ${bg} ${border} p-4 flex items-center gap-3 shadow-sm`}>
    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
      <Icon size={18} className={iconColor} />
    </div>
    <div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold ${textColor}`} style={{ fontFamily: "Sora, sans-serif" }}>{value}</p>
    </div>
  </div>
);

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
  const barColor = pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-yellow-400" : "bg-red-500";
  const statusText = pct >= 75
    ? "Great attendance! Keep it up."
    : pct >= 50 ? "Below recommended 75% — improve attendance."
    : "Critical — attendance very low!";
  const statusColor = pct >= 75 ? "text-green-600" : pct >= 50 ? "text-yellow-600" : "text-red-600";
  const statusBg    = pct >= 75 ? "bg-green-50 border-green-200" : pct >= 50 ? "bg-yellow-50 border-yellow-200" : "bg-red-50 border-red-200";

  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      <Navbar role={user.role} />

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: "Sora, sans-serif" }}>
            Student Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Welcome, <span className="font-semibold text-primary">{user.name}</span>
            {user.rollNumber && <span className="ml-2 text-gray-400">• Roll No: {user.rollNumber}</span>}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-gray-400 text-sm">Loading attendance...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <StatCard label="Total Classes" value={attendance?.total   || 0}
                icon={Calendar}    iconColor="text-blue-500"
                bg="bg-blue-50"   border="border-blue-200"  textColor="text-blue-800" />
              <StatCard label="Present" value={attendance?.present || 0}
                icon={CheckCircle} iconColor="text-green-500"
                bg="bg-green-50"  border="border-green-200" textColor="text-green-700" />
              <StatCard label="Absent"  value={attendance?.absent  || 0}
                icon={XCircle}     iconColor="text-red-500"
                bg="bg-red-50"    border="border-red-200"   textColor="text-red-600" />
              <StatCard label="Attendance" value={attendance?.attendancePercentage || "0%"}
                icon={TrendingUp}  iconColor="text-indigo-500"
                bg="bg-indigo-50" border="border-indigo-200" textColor="text-indigo-700" />
            </div>

            {/* Status Banner */}
            <div className={`border rounded-xl px-4 py-3 mb-5 flex items-center gap-2 ${statusBg}`}>
              {pct >= 75
                ? <CheckCircle size={16} className="text-green-500 shrink-0" />
                : <XCircle size={16} className="text-red-500 shrink-0" />}
              <p className={`text-sm font-medium ${statusColor}`}>{statusText}</p>
            </div>

            {/* Progress Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-gray-700" style={{ fontFamily: "Sora, sans-serif" }}>
                  Attendance Overview
                </h2>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  pct >= 75 ? "bg-green-100 text-green-700"
                  : pct >= 50 ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-600"
                }`}>{attendance?.attendancePercentage || "0%"}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden mb-1">
                <div className={`h-3 rounded-full transition-all duration-700 ${barColor}`}
                  style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0%</span>
                <span className="text-orange-400 font-medium">75% minimum</span>
                <span>100%</span>
              </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <BookOpen size={16} className="text-gray-400" />
                <h2 className="font-bold text-gray-700" style={{ fontFamily: "Sora, sans-serif" }}>
                  Attendance History
                </h2>
                <span className="ml-auto text-xs text-gray-400">{attendance?.records?.length || 0} records</span>
              </div>

              {error && <div className="px-5 py-3 text-red-600 text-sm">{error}</div>}

              {!attendance?.records?.length ? (
                <div className="text-center py-12 text-gray-400">
                  <Calendar size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No attendance records yet.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-5 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">Subject</th>
                      <th className="text-left px-5 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">Date</th>
                      <th className="text-left px-5 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {attendance.records.map((rec) => (
                      <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-700">{rec.subject}</td>
                        <td className="px-5 py-3 text-gray-500">{rec.date}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            rec.status === "Present"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-600"
                          }`}>
                            {rec.status === "Present"
                              ? <CheckCircle size={11} />
                              : <XCircle size={11} />}
                            {rec.status}
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

        <p className="text-xs text-gray-400 text-center mt-10">Created by Siddhesh Kewate, IBM Btech</p>
      </div>
    </div>
  );
};

export default StudentDashboard;