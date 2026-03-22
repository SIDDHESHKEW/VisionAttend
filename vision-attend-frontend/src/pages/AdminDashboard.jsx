import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import API from "../services/api";

const StatCard = ({ label, value, icon, color }) => {
  const c = {
    blue:   "bg-blue-100 text-blue-800 border-blue-400",
    green:  "bg-green-100 text-green-700 border-green-400",
    red:    "bg-red-100 text-red-700 border-red-400",
    yellow: "bg-yellow-100 text-yellow-700 border-yellow-400",
    indigo: "bg-indigo-100 text-indigo-700 border-indigo-400",
  }[color] || "bg-gray-100 text-gray-700 border-gray-300";

  return (
    <div className={`rounded-2xl border-2 p-4 flex items-center gap-3 shadow-lg hover:scale-105 transition-transform ${c}`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs font-medium opacity-70">{label}</p>
        <p className="text-2xl font-bold" style={{ fontFamily: "Sora, sans-serif" }}>{value}</p>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [users, setUsers]             = useState([]);
  const [attendance, setAttendance]   = useState([]);
  const [userSummary, setUserSummary] = useState({});
  const [attSummary, setAttSummary]   = useState({});
  const [activeTab, setActiveTab]     = useState("users");
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [toast, setToast]             = useState("");

  // Analytics filters
  const [filterDate, setFilterDate]         = useState("");
  const [filterStudentId, setFilterStudentId] = useState("");
  const [analyticsData, setAnalyticsData]   = useState(null);
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

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDate)      params.append("date",      filterDate);
      if (filterStudentId) params.append("studentId", filterStudentId);
      const res = await API.get(`/admin/attendance?${params}`);
      setAnalyticsData(res.data);
    } catch { showToast("❌ Analytics fetch failed."); }
    finally { setAnalyticsLoading(false); }
  };

  const handleOverride = async (id, status) => {
    try {
      await API.patch(`/admin/attendance/${id}`, { status: status === "Present" ? "Absent" : "Present" });
      showToast("✅ Status toggled."); fetchData();
    } catch { showToast("❌ Override failed."); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}" and all their records?`)) return;
    try {
      await API.delete(`/admin/user/${id}`);
      showToast(`✅ ${name} deleted.`); fetchData();
    } catch (err) { showToast("❌ " + (err.response?.data?.message || "Delete failed.")); }
  };

  const roleColor = (r) => r === "admin"   ? "bg-purple-100 text-purple-700"
                          : r === "teacher" ? "bg-blue-100 text-primary"
                          : "bg-green-100 text-green-700";

  const students = users.filter((u) => u.role === "student");

  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      <Navbar role={user.role} />
      <div className="max-w-6xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: "Sora, sans-serif" }}>Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome, <span className="font-semibold text-primary">{user.name}</span> 👋</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <StatCard label="Total Users"     value={userSummary.total    || 0} icon="👥" color="blue"   />
          <StatCard label="Students"        value={userSummary.students || 0} icon="🎓" color="indigo" />
          <StatCard label="Teachers"        value={userSummary.teachers || 0} icon="👨‍🏫" color="yellow" />
          <StatCard label="Present Records" value={attSummary.present   || 0} icon="✅" color="green"  />
          <StatCard label="Absent Records"  value={attSummary.absent    || 0} icon="❌" color="red"    />
        </div>

        {/* Toast */}
        {toast && <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-3 rounded-xl mb-4">{toast}</div>}
        {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">⚠️ {error}</div>}

        {/* ── Analytics Section ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
          <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2" style={{ fontFamily: "Sora, sans-serif" }}>
            <span className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs">📊</span>
            Analytics Filter
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">📅 Filter by Date</label>
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">👤 Filter by Student</label>
              <select value={filterStudentId} onChange={(e) => setFilterStudentId(e.target.value)} className="input-field text-sm">
                <option value="">All students</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} {s.rollNumber ? `(${s.rollNumber})` : ""}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button onClick={fetchAnalytics} disabled={analyticsLoading} className="flex-1 btn-primary text-sm py-2.5 disabled:opacity-60">
                {analyticsLoading ? "Loading..." : "🔍 Apply Filter"}
              </button>
              <button onClick={() => { setFilterDate(""); setFilterStudentId(""); setAnalyticsData(null); }}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold rounded-xl transition-all">
                Clear
              </button>
            </div>
          </div>

          {/* Analytics result */}
          {analyticsData && (
            <div className="mt-4">
              <div className="flex gap-3 mb-3">
                <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="font-bold text-primary text-xl">{analyticsData.summary.total}</p>
                </div>
                <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">Present</p>
                  <p className="font-bold text-green-700 text-xl">{analyticsData.summary.present}</p>
                </div>
                <div className="flex-1 bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">Absent</p>
                  <p className="font-bold text-red-600 text-xl">{analyticsData.summary.absent}</p>
                </div>
                {analyticsData.summary.total > 0 && (
                  <div className="flex-1 bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-gray-500">Rate</p>
                    <p className="font-bold text-indigo-700 text-xl">
                      {((analyticsData.summary.present / analyticsData.summary.total) * 100).toFixed(0)}%
                    </p>
                  </div>
                )}
              </div>

              {analyticsData.records.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-3 py-2 text-gray-500 font-medium">Student</th>
                        <th className="text-left px-3 py-2 text-gray-500 font-medium">Subject</th>
                        <th className="text-left px-3 py-2 text-gray-500 font-medium">Date</th>
                        <th className="text-left px-3 py-2 text-gray-500 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsData.records.map((r) => (
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
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {["users","attendance"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === tab ? "bg-primary text-white shadow" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"}`}>
              {tab === "users" ? `👥 Users (${userSummary.total || 0})` : `📋 Attendance (${attSummary.total || 0})`}
            </button>
          ))}
          <button onClick={fetchData} className="ml-auto px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 hover:bg-gray-50 transition-all">🔄 Refresh</button>
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
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-gray-700" style={{ fontFamily: "Sora, sans-serif" }}>All Users</h2>
                  <span className="text-xs text-gray-400">{users.length} total</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Name</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Email</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Role</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Roll</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Face</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">No users yet.</td></tr>
                      ) : users.map((u) => (
                        <tr key={u.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-700">{u.name}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                          <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleColor(u.role)}`}>{u.role}</span></td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{u.rollNumber || "—"}</td>
                          <td className="px-4 py-3">
                            {u.faceEmbeddings && u.faceEmbeddings !== "dummy-embeddings"
                              ? <span className="text-green-600 text-xs font-semibold">✅ Yes</span>
                              : <span className="text-gray-400 text-xs">❌ No</span>}
                          </td>
                          <td className="px-4 py-3">
                            {u.role !== "admin" && (
                              <button onClick={() => handleDelete(u.id, u.name)}
                                className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded-lg font-medium transition-all border border-red-200">
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
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-gray-700" style={{ fontFamily: "Sora, sans-serif" }}>All Attendance</h2>
                  <span className="text-xs text-gray-400">{attendance.length} records</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Student</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Roll</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Subject</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                        <th className="text-left px-4 py-3 text-gray-500 font-medium">Override</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">No records yet.</td></tr>
                      ) : attendance.map((rec) => (
                        <tr key={rec.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-700">{rec.User?.name || "—"}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{rec.User?.rollNumber || "—"}</td>
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