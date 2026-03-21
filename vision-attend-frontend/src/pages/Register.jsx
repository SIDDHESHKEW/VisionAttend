import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ name: "", email: "", password: "", role: "student", rollNumber: "" });
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(""); setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post("/auth/register", form);
      setSuccess("Account created! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-800 to-blue-600 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur rounded-2xl mb-4 border border-white/20">
            <span className="text-3xl">🎓</span>
          </div>
          <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
            Vision<span className="text-secondary">Attend</span>
          </h1>
          <p className="text-blue-200 mt-1 text-sm">Create your account</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-1" style={{ fontFamily: "Sora, sans-serif" }}>Register</h2>
          <p className="text-gray-400 text-sm mb-6">Fill in your details below</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
              <span>✅</span> {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Full Name</label>
              <input name="name" placeholder="John Doe" value={form.name} onChange={handleChange} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Email Address</label>
              <input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Password</label>
              <input name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Role</label>
              <select name="role" value={form.role} onChange={handleChange} className="input-field">
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {form.role === "student" && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Roll Number</label>
                <input name="rollNumber" placeholder="e.g. 101" value={form.rollNumber} onChange={handleChange} className="input-field" />
              </div>
            )}
            <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-base mt-2 disabled:opacity-60">
              {loading ? "Creating Account..." : "Create Account →"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
        </div>

        <p className="text-center text-xs text-blue-200/60 mt-6">Created by Siddhesh Kewate, IBM Btech</p>
      </div>
    </div>
  );
};

export default Register;