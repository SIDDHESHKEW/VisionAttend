import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";
import CameraCapture from "../components/CameraCapture";

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm]           = useState({ name: "", email: "", password: "", role: "student", rollNumber: "" });
  const [captures, setCaptures]   = useState([]);
  const [faceStatus, setFaceStatus] = useState([]);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [step, setStep]           = useState("form");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(""); setSuccess("");
  };

  const handleCapture = (newCaptures, newFaceStatus) => {
    setCaptures(newCaptures);
    setFaceStatus(newFaceStatus);
  };

  const validCaptures = captures.filter((_, i) => faceStatus[i] === true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");

    // Validate face captures for students
    if (form.role === "student" && validCaptures.length < 2) {
      setError("Please capture at least 2 clear face photos before registering.");
      return;
    }

    setLoading(true);
    try {
      // ── Step 1: Register user ──────────────────────────────────────────────
      setStep("registering");
      await API.post("/auth/register", form);

      // ── Step 2: Auto-login ─────────────────────────────────────────────────
      const loginRes = await API.post("/auth/login", {
        email: form.email, password: form.password,
      });
      const { token, user } = loginRes.data;
      localStorage.setItem("token", token);
      localStorage.setItem("role",  user.role);
      localStorage.setItem("user",  JSON.stringify(user));

      // ── Step 3: Upload face captures (students only) ───────────────────────
      if (form.role === "student" && validCaptures.length > 0) {
        setStep("uploading");
        setSuccess("✅ Account created! Uploading face data...");

        // Convert base64 captures to File objects for FormData
        const formData = new FormData();
        validCaptures.forEach((base64, i) => {
          const byteString = atob(base64);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let j = 0; j < byteString.length; j++) {
            ia[j] = byteString.charCodeAt(j);
          }
          const blob = new Blob([ab], { type: "image/jpeg" });
          formData.append("faces", blob, `capture_${i}.jpg`);
        });

        await API.post("/users/upload-face", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        setSuccess("✅ Account + face registered successfully!");
      } else {
        setSuccess("✅ Account created! Redirecting...");
      }

      setStep("done");
      setTimeout(() => {
        if (user.role === "admin")        navigate("/admin");
        else if (user.role === "teacher") navigate("/teacher");
        else                              navigate("/student");
      }, 1500);

    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
      setStep("form");
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
        {/* Logo */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur rounded-2xl mb-3 border border-white/20">
            <span className="text-2xl">🎓</span>
          </div>
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "Sora, sans-serif" }}>
            Vision<span className="text-secondary">Attend</span>
          </h1>
          <p className="text-blue-200 text-xs mt-1">Create your account</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1" style={{ fontFamily: "Sora, sans-serif" }}>Register</h2>
          <p className="text-gray-400 text-xs mb-4">Fill in your details below</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2.5 rounded-xl mb-3 flex items-center gap-2">
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 text-xs px-3 py-2.5 rounded-xl mb-3 flex items-center gap-2">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
              <input name="name" placeholder="John Doe" value={form.name} onChange={handleChange} className="input-field text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email Address</label>
              <input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} className="input-field text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
              <input name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} className="input-field text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
              <select name="role" value={form.role} onChange={handleChange} className="input-field text-sm">
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {form.role === "student" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Roll Number</label>
                  <input name="rollNumber" placeholder="e.g. 101" value={form.rollNumber} onChange={handleChange} className="input-field text-sm" />
                </div>

                {/* Camera Face Capture */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Face Registration <span className="text-red-500">*</span>
                    <span className="text-gray-400 font-normal ml-1">(min 2 photos required)</span>
                  </label>
                  <CameraCapture
                    onCapture={handleCapture}
                    minCaptures={2}
                    maxCaptures={3}
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading || (form.role === "student" && validCaptures.length < 2)}
              className="w-full btn-primary py-3 text-sm mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  {step === "uploading" ? "Uploading face..." : "Creating account..."}
                </span>
              ) : form.role === "student" && validCaptures.length < 2
                ? `Capture ${2 - validCaptures.length} more photo(s) to continue`
                : "Create Account →"
              }
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
          </p>
        </div>

        <p className="text-center text-xs text-blue-200/60 mt-4">Created by Siddhesh Kewate, IBM Btech</p>
      </div>
    </div>
  );
};

export default Register;