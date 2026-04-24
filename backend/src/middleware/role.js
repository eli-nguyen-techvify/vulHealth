// VULN A01: role check is deliberately applied to only SOME admin routes.
// Many admin endpoints mount only requireAuth without this guard.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden', requiredRoles: roles });
    }
    next();
  };
}

module.exports = { requireRole };
