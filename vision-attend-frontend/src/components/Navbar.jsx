import { useNavigate } from "react-router-dom";

const Navbar = ({ role }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <nav className="bg-primary shadow-lg sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center shadow">
            <span className="text-white font-bold text-sm" style={{ fontFamily: "Sora, sans-serif" }}>V</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>
            Vision<span className="text-secondary">Attend</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {role && (
            <span className="hidden sm:inline-flex items-center gap-1 bg-blue-800 text-secondary text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
              {role}
            </span>
          )}
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-3 py-1.5 rounded-xl transition-all border border-white/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;