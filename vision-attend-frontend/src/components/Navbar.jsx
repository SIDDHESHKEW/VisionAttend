import { useNavigate } from "react-router-dom";
import { LogOut, GraduationCap } from "lucide-react";

const Navbar = ({ role }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const roleLabels = { student: "Student", teacher: "Teacher", admin: "Admin" };

  return (
    <nav className="bg-primary shadow-lg sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center shadow">
            <GraduationCap size={16} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>
            Vision<span className="text-secondary">Attend</span>
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {role && (
            <span className="hidden sm:inline-flex items-center gap-1 bg-blue-800 text-secondary text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
              {roleLabels[role] || role}
            </span>
          )}
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-3 py-1.5 rounded-xl transition-all border border-white/20">
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;