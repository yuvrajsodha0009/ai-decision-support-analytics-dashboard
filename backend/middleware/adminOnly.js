const User = require("../models/User");
const { isAdminRole, normalizeRole } = require("../utils/roles");

module.exports = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Prefer role attached by authMiddleware
    if (req.user && isAdminRole(req.user.role)) {
      req.user.role = normalizeRole(req.user.role);
      return next();
    }

    // Fallback to DB lookup for compatibility with older tokens
    const user = await User.findById(req.userId).select("role");
    if (!user) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const role = normalizeRole(user.role);
    if (isAdminRole(role)) {
      if (req.user) req.user.role = role;
      return next();
    }

    return res.status(403).json({ message: "Forbidden" });
  } catch (error) {
    console.error("Admin check failed:", error);
    res.status(500).json({ message: "Failed to authorize admin" });
  }
};
