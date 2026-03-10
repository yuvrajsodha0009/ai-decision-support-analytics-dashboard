const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { normalizeRole } = require("../utils/roles");

// Authentication middleware:
// - Verifies Bearer token
// - Preserves `req.userId` for backward-compat
// - Attaches `req.user = { id, role, companyId }` for RBAC use
module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // keep legacy req.userId for controllers that rely on it
    req.userId = decoded.id;

    // Prefer role/companyId from token, but fall back to DB lookup when absent
    let role = decoded.role ? normalizeRole(decoded.role) : null;
    let companyId = decoded.companyId || null;

    if (!role) {
      try {
        const dbUser = await User.findById(req.userId).select("role companyId");
        if (dbUser) {
          role = normalizeRole(dbUser.role);
          companyId = dbUser.companyId || null;
        }
      } catch (e) {
        // ignore DB errors here; we'll default below
      }
    }

    if (!role) role = "Employee";

    req.user = { id: req.userId, role, companyId };

    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
