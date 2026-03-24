import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import API from "../services/api";

const StatCard = ({ label, value, icon, color }) => {
  const colors = {
    blue:   "bg-blue-50 text-primary border-blue-100",
    green:  "bg-green-50 text-green-700 border-green-100",
    red:    "bg-red-50 text-red-600 border-red-100",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
  };
  return (
    <div className={`rounded-2xl border p-4 flex items-center gap-3 ${colors[color]}`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold" style={{ fontFamily: "Sora, sans-serif" }}>{value}</p>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [users, setUsers]               = useState([]);
  const [attendance, setAttendance]     = useState([]);
  const [userSummary, setUserSummary]   = useState({});
  const [attSummary, setAttSummary]     = useState({});
  const [activeTab, setActiveTab]       = useState("users");
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [toast, setToast]               = useState("");
  const [filterDate, setFilterDate]     = useState("");
  const [filterStudent, setFilterStudent] = useState("");
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const fetchData = async () => {
    setLoading(true); setError("");
    try {
      const [ur, ar] = await Promise.all([API.get("/admin/users"), API.get("/admin/attendance")]);
      setUsers(ur.data.users);
      setUserSummary(ur.data.summary);
      setAttendance(ar.data.records);
      setAttSummary(ar.data.summary);
    } catch { setError("Failed to load data. Is the backend running?"); }
    finally { setLoading(false); }
  };

  const handleOverride = async (id, currentStatus) => {
    const newStatus = currentStatus === "Present" ? "Absent" : "Present";
    try {
      await API.patch(`/admin/attendance/${id}`, { status: newStatus });
      // Update local state — no page reload
      setAttendance((prev) =>
        prev.map((item) => item.id === id ? { ...item, status: newStatus } : item)
      );
      showToast(`✅ Status updated to ${newStatus}`);
    } catch { showToast("❌ Override failed."); }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? All attendance records will also be deleted.`)) return;
    try {
      await API.delete(`/admin/user/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      showToast(`✅ ${name} deleted.`);
    } catch (err) {
      showToast("❌ " + (err.response?.data?.message || "Delete failed."));
    }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDate)    params.append("date",      filterDate);
      if (filterStudent) params.append("studentId", filterStudent);
      const res = await API.get(`/admin/attendance?${params.toString()}`);
      setAnalyticsData(res.data);
    } catch { showToast("❌ Analytics fetch failed."); }
    finally { setAnalyticsLoading(false); }
  };

  const roleColor = (role) => {
    if (role === "admin")   return "bg-purple-100 text-purple-700";
    if (role === "teacher") return "bg-blue-100 text-primary";
    return "bg-green-100 text-green-700";
  };

  const studentUsers = users.filter((u) => u.role === "student");

  const studentStats = analyticsData && filterStudent ? (() => {
    const r = analyticsData.records;
    const t = r.length;
    const p = r.filter((x) => x.status === "Present").length;
    return { total: t, present: p, absent: t - p, pct: t > 0 ? ((p/t)*100).toFixed(1) : 0 };
  })() : null;

  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      <Navbar role={user.role} />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: "Sora, sans-serif" }}>Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome, <span className="font-semibold text-primary">{user.name}</span> 👋</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Users"     value={userSummary.total    || 0} icon="👥" color="blue"   />
          <StatCard label="Students"        value={userSummary.students || 0} icon="🎓" color="green"  />
          <StatCard label="Present Records" value={attSummary.present   || 0} icon="✅" color="green"  />
          <StatCard label="Absent Records"  value={attSummary.absent    || 0} icon="❌" color="red"    />
        </div>

        {toast && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-3 rounded-xl mb-4">{toast}</div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">⚠️ {error}</div>
        )}

        {/* Analytics */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
          <h2 className="font-bold text-gray-700 mb-4" style={{ fontFamily: "Sora, sans-serif" }}>📈 Analytics & Filters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">📅 Filter by Date</label>
              <input type="date" value={filterDate}
                onChange={(e) => { setFilterDate(e.target.value); setFilterStudent(""); }}
                className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">👤 Filter by Student</label>
              <select value={filterStudent}
                onChange={(e) => { setFilterStudent(e.target.value); setFilterDate(""); }}
                className="input-field text-sm">
                <option value="">-- Select Student --</option>
                {studentUsers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} (Roll: {s.rollNumber || "—"})</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={fetchAnalytics}
                disabled={analyticsLoading || (!filterDate && !filterStudent)}
                className="w-full btn-primary text-sm py-2.5 disabled:opacity-50">
                {analyticsLoading ? "Loading..." : "🔍 Apply Filter"}
              </button>
            </div>
          </div>

          {analyticsData && (
            <div className="mt-4">
              {studentStats && (
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { l: "Total",   v: studentStats.total,   c: "text-blue-800 bg-blue-50 border-blue-200" },
                    { l: "Present", v: studentStats.present, c: "text-green-700 bg-green-50 border-green-200" },
                    { l: "Absent",  v: studentStats.absent,  c: "text-red-700 bg-red-50 border-red-200" },
                    { l: "%",       v: `${studentStats.pct}%`, c: "text-indigo-700 bg-indigo-50 border-indigo-200" },
                  ].map((s) => (
                    <div key={s.l} className={`border rounded-xl p-3 text-center ${s.c}`}>
                      <p className="text-xs text-gray-500">{s.l}</p>
                      <p className="text-xl font-bold">{s.v}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Student","Subject","Date","Status"].map((h) => (
                        <th key={h} className="text-left px-3 py-2.5 text-gray-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analyticsData.records.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-6 text-gray-400">No records for this filter.</td></tr>
                    ) : analyticsData.records.map((r) => (
                      <tr key={r.id} className="border-t border-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-700">{r.User?.name}</td>
                        <td className="px-3 py-2 text-gray-500">{r.subject}</td>
                        <td className="px-3 py-2 text-gray-500">{r.date}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.status === "Present" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                            {r.status}
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

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {[["users", `👥 Users (${userSummary.total||0})`], ["attendance", `📋 Attendance (${attSummary.total||0})`]].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === key ? "bg-primary text-white shadow" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
              {label}
            </button>
          ))}
          <button onClick={fetchData} className="ml-auto px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50">
            🔄 Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
        ) : (
          <>
            {activeTab === "users" && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between">
                  <h2 className="font-bold text-gray-700" style={{ fontFamily: "Sora, sans-serif" }}>All Users</h2>
                  <span className="text-xs text-gray-400">{users.length} total</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>{["Name","Email","Role","Roll","Face","Action"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {users.length === 0
                        ? <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">No users.</td></tr>
                        : users.map((u) => (
                          <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-700">{u.name}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                            <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleColor(u.role)}`}>{u.role}</span></td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{u.rollNumber||"—"}</td>
                            <td className="px-4 py-3">
                              {u.faceEmbeddings && u.faceEmbeddings !== "dummy-embeddings"
                                ? <span className="text-green-600 text-xs font-semibold">✅ Yes</span>
                                : <span className="text-gray-400 text-xs">❌ No</span>}
                            </td>
                            <td className="px-4 py-3">
                              {u.role !== "admin" && (
                                <button onClick={() => handleDeleteUser(u.id, u.name)}
                                  className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded-lg font-medium border border-red-200">
                                  🗑 Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "attendance" && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between">
                  <h2 className="font-bold text-gray-700" style={{ fontFamily: "Sora, sans-serif" }}>All Attendance</h2>
                  <span className="text-xs text-gray-400">{attendance.length} records</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>{["Student","Roll","Subject","Date","Status","Override"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {attendance.length === 0
                        ? <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">No records.</td></tr>
                        : attendance.map((rec) => (
                          <tr key={rec.id} className="border-t border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-700">{rec.User?.name||"—"}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{rec.User?.rollNumber||"—"}</td>
                            <td className="px-4 py-3 text-gray-500">{rec.subject}</td>
                            <td className="px-4 py-3 text-gray-500">{rec.date}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${rec.status === "Present" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                                {rec.status === "Present" ? "✓ Present" : "✗ Absent"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button onClick={() => handleOverride(rec.id, rec.status)}
                                className="text-xs bg-gray-100 hover:bg-primary hover:text-white text-gray-700 px-3 py-1 rounded-lg font-medium transition-all">
                                Toggle
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        <p className="text-xs text-gray-400 text-center mt-8">Created by Siddhesh Kewate, IBM Btech</p>
      </div>
    </div>
  );
};

export default AdminDashboard;