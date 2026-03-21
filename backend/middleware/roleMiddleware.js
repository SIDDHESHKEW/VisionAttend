/**
 * Role-Based Access Control middleware.
 * Usage: roleMiddleware(["admin", "teacher"])
 * Must be used AFTER authMiddleware (req.user must be set).
 */
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized. Please log in." });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden. Required role(s): ${allowedRoles.join(", ")}.`,
      });
    }

    next();
  };
};

export default roleMiddleware;