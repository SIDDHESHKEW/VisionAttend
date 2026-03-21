import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
});

// ─── Request interceptor: attach token ───────────────────────────────────────
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// ─── Response interceptor: handle 401 auto-logout ────────────────────────────
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default API;