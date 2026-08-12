const { decodeSession } = require('../controllers/auth.controller');

function authenticate(req, _res, next) {
  try {
    req.user = decodeSession(req);
    next();
  } catch (error) {
    next(error);
  }
}

function allowRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const error = new Error('You do not have permission to perform this action.');
      error.statusCode = 403;
      return next(error);
    }
    return next();
  };
}

module.exports = { authenticate, allowRoles };
