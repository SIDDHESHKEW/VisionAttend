const Card = ({ title, value, icon, color = "blue", subtitle }) => {
  const colorMap = {
    blue:   { bg: "bg-blue-50",   icon: "bg-primary",    text: "text-primary" },
    green:  { bg: "bg-green-50",  icon: "bg-green-600",  text: "text-green-600" },
    red:    { bg: "bg-red-50",    icon: "bg-red-500",    text: "text-red-500" },
    yellow: { bg: "bg-yellow-50", icon: "bg-yellow-500", text: "text-yellow-600" },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`rounded-2xl shadow-sm p-4 flex items-center gap-3 border border-white/60 ${c.bg}`}>
      {/* Icon — smaller on mobile */}
      <div className={`w-10 h-10 sm:w-12 sm:h-12 ${c.icon} rounded-xl flex items-center justify-center shadow flex-shrink-0`}>
        <span className="text-base sm:text-xl">{icon}</span>
      </div>
      {/* Text */}
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium truncate">{title}</p>
        <p className={`text-xl sm:text-2xl font-bold leading-tight ${c.text}`} style={{ fontFamily: "Sora, sans-serif" }}>
          {value}
        </p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
      </div>
    </div>
  );
};

export default Card;