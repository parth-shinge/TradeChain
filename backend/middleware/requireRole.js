/**
 * Role-based authorization middleware factory.
 * @param {string[]} allowedRoles - Array of allowed role strings (e.g., ['ADMIN', 'CFA'])
 * @returns {Function} Express middleware
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Access denied",
        message: `Required role: ${allowedRoles.join(" or ")}. Your role: ${req.user.role}`,
      });
    }

    next();
  };
}

module.exports = requireRole;
