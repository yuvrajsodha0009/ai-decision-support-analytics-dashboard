const auth = require('./authMiddleware');
const { normalizeRole } = require("../utils/roles");

// checkRole(allowedRoles) => middleware that ensures req.user.role is in allowedRoles
function checkRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
      return next();
    }

    const normalizedAllowed = [...new Set(allowedRoles.map((role) => normalizeRole(role)))];
    const userRole = normalizeRole(req.user.role);
    req.user.role = userRole;

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return next();
  };
}

// requireAuthAndRole(roles) => returns an array [authMiddleware, checkRole(roles)]
// Usage in routes: router.post('/x', ...requireAuthAndRole(['Manager', 'Admin']), handler)
function requireAuthAndRole(roles) {
  return [auth, checkRole(roles)];
}

module.exports = { checkRole, requireAuthAndRole };
