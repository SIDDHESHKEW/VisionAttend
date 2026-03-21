// ─── Auth Utility Helpers ─────────────────────────────────────────────────────

export const getToken = () => localStorage.getItem("token");

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

export const getRole = () => localStorage.getItem("role");

export const isLoggedIn = () => !!getToken();

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("user");
  window.location.href = "/login";
};