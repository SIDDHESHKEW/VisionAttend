import { useState, useEffect } from "react";
import { Users, GraduationCap, CheckCircle, XCircle, RefreshCw, Trash2, SlidersHorizontal, ToggleLeft, ToggleRight } from "lucide-react";
import Navbar from "../components/Navbar";
import API from "../services/api";

const StatCard = ({ label, value, icon: Icon, color }) => {
  const colors = {
    blue:   "bg-blue-50 border-blue-200 text-blue-800",
    green:  "bg-green-50 border-green-200 text-green-700",
    red:    "bg-red-50 border-red-200 text-red-600",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
  };
  return (
    <div className={`rounded-2xl border-2 ${colors[color]} p-4 flex items-center gap-3 shadow-sm`}>
      <Icon size={20} className="opacity-60 shrink-0" />
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

  // ── Smooth toggle — NO page reload ───────────────────────────────────────
  const handleOverride = async (id, currentStatus) => {
    const newStatus = currentStatus === "Present" ? "Absent" : "Present";
    try {
      await API.patch(`/admin/attendance/${id}`, { status: newStatus });
      setAttendance((prev) =>
        prev.map((item) => item.id === id ? { ...item, status: newStatus } : item)
      );
      showToast(`Status updated to ${newStatus}`);
    } catch { showToast("Override failed."); }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? All their attendance records will also be deleted.`)) return;
    try {
      await API.delete(`/admin/user/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      showToast(`${name} deleted successfully.`);
    } catch (err) { showToast(err.response?.data?.message || "Delete failed."); }
  };

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDate)    params.append("date",      filterDate);
      if (filterStudent) params.append("studentId", filterStudent);
      const res = await API.get(`/admin/attendance?${params.toString()}`);
      setAnalyticsData(res.data);
    } catch { showToast("Analytics fetch failed."); }
    finally { setAnalyticsLoading(false); }
  };

  const roleStyle = (role) => {
    if (role === "admin")   return "bg-purple-100 text-purple-700 border border-purple-200";
    if (role === "teacher") return "bg-blue-100 text-blue-700 border border-blue-200";
    return "bg-gray-100 text-gray-600 border border-gray-200";
  };

  const studentUsers    = users.filter((u) => u.role === "student");
  const studentStats    = analyticsData && filterStudent ? (() => {
    const r = analyticsData.records;
    const t = r.length;
    const p = r.filter((x) => x.status === "Present").length;
    return { total: t, present: p, absent: t - p, pct: t > 0 ? ((p/t)*100).toFixed(1) : 0 };
  })() : null;

  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      <Navbar role={user.role} />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800" style={{ fontFamily: "Sora, sans-serif" }}>Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome, <span className="font-semibold text-primary">{user.name}</span></p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Users"     value={userSummary.total    || 0} icon={Users}         color="blue"   />
          <StatCard label="Students"        value={userSummary.students || 0} icon={GraduationCap} color="blue"   />
          <StatCard label="Present Records" value={attSummary.present   || 0} icon={CheckCircle}   color="green"  />
          <StatCard label="Absent Records"  value={attSummary.absent    || 0} icon={XCircle}       color="red"    />
        </div>

        {/* Toast */}
        {toast && (
          <div className="bg-primary/10 border border-primary/20 text-primary text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
            <CheckCircle size={14} className="shrink-0" /> {toast}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
        )}

        {/* Analytics */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5">
          <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2" style={{ fontFamily: "Sora, sans-serif" }}>
            <SlidersHorizontal size={16} className="text-gray-400" /> Analytics & Filters
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Filter by Date</label>
              <input type="date" value={filterDate}
                onChange={(e) => { setFilterDate(e.target.value); setFilterStudent(""); setAnalyticsData(null); }}
                className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Filter by Student</label>
              <select value={filterStudent}
                onChange={(e) => { setFilterStudent(e.target.value); setFilterDate(""); setAnalyticsData(null); }}
                className="input-field text-sm">
                <option value="">Select a student...</option>
                {studentUsers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — Roll {s.rollNumber || "N/A"}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={fetchAnalytics}
                disabled={analyticsLoading || (!filterDate && !filterStudent)}
                className="w-full btn-primary text-sm py-2.5 disabled:opacity-50">
                {analyticsLoading ? "Loading..." : "Apply Filter"}
              </button>
            </div>
          </div>

          {analyticsData && (
            <div className="mt-5">
              {studentStats && (
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { l: "Total",   v: studentStats.total,   c: "bg-blue-50 border-blue-200 text-blue-800" },
                    { l: "Present", v: studentStats.present, c: "bg-green-50 border-green-200 text-green-700" },
                    { l: "Absent",  v: studentStats.absent,  c: "bg-red-50 border-red-200 text-red-600" },
                    { l: "Attendance %", v: `${studentStats.pct}%`, c: "bg-indigo-50 border-indigo-200 text-indigo-700" },
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
                    <tr>{["Student","Subject","Date","Status"].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 text-gray-500 font-medium uppercase tracking-wider">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {analyticsData.records.length === 0
                      ? <tr><td colSpan={4} className="text-center py-6 text-gray-400">No records for this filter.</td></tr>
                      : analyticsData.records.map((r) => (
                        <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-700">{r.User?.name}</td>
                          <td className="px-4 py-2.5 text-gray-500">{r.subject}</td>
                          <td className="px-4 py-2.5 text-gray-500">{r.date}</td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              r.status === "Present" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                            }`}>{r.status}</span>
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
        <div className="flex items-center gap-2 mb-5">
          {[["users",`Users (${userSummary.total||0})`],["attendance",`Attendance (${attSummary.total||0})`]].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === key ? "bg-primary text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}>{label}</button>
          ))}
          <button onClick={fetchData} className="ml-auto p-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-500">
            <RefreshCw size={15} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Users */}
            {activeTab === "users" && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h2 className="font-bold text-gray-700" style={{ fontFamily: "Sora, sans-serif" }}>All Users</h2>
                  <span className="text-xs text-gray-400">{users.length} total</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>{["Name","Email","Role","Roll","Face","Action"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {users.length === 0
                        ? <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">No users found.</td></tr>
                        : users.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3.5 font-semibold text-gray-800">{u.name}</td>
                            <td className="px-5 py-3.5 text-gray-500 text-xs">{u.email}</td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${roleStyle(u.role)}`}>{u.role}</span>
                            </td>
                            <td className="px-5 py-3.5 text-gray-500 text-xs">{u.rollNumber||"—"}</td>
                            <td className="px-5 py-3.5">
                              {u.faceEmbeddings && u.faceEmbeddings !== "dummy-embeddings"
                                ? <span className="inline-flex items-center gap-1 text-green-600 text-xs font-semibold"><CheckCircle size={12}/> Registered</span>
                                : <span className="inline-flex items-center gap-1 text-gray-400 text-xs"><XCircle size={12}/> None</span>}
                            </td>
                            <td className="px-5 py-3.5">
                              {u.role !== "admin" && (
                                <button onClick={() => handleDeleteUser(u.id, u.name)}
                                  className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-all">
                                  <Trash2 size={12} /> Delete
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

            {/* Attendance */}
            {activeTab === "attendance" && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                  <h2 className="font-bold text-gray-700" style={{ fontFamily: "Sora, sans-serif" }}>All Attendance</h2>
                  <span className="text-xs text-gray-400">{attendance.length} records</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>{["Student","Roll","Subject","Date","Status","Override"].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-gray-500 font-medium text-xs uppercase tracking-wider">{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {attendance.length === 0
                        ? <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">No records.</td></tr>
                        : attendance.map((rec) => (
                          <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3.5 font-semibold text-gray-800">{rec.User?.name||"—"}</td>
                            <td className="px-5 py-3.5 text-gray-500 text-xs">{rec.User?.rollNumber||"—"}</td>
                            <td className="px-5 py-3.5 text-gray-600">{rec.subject}</td>
                            <td className="px-5 py-3.5 text-gray-500">{rec.date}</td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                rec.status === "Present" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                              }`}>
                                {rec.status === "Present" ? <CheckCircle size={10}/> : <XCircle size={10}/>}
                                {rec.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <button onClick={() => handleOverride(rec.id, rec.status)}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-primary px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-all">
                                {rec.status === "Present"
                                  ? <><ToggleRight size={14} className="text-green-500"/> Mark Absent</>
                                  : <><ToggleLeft  size={14} className="text-gray-400"/> Mark Present</>}
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

        <p className="text-xs text-gray-400 text-center mt-10">Created by Siddhesh Kewate, IBM Btech</p>
      </div>
    </div>
  );
};

export default AdminDashboard;