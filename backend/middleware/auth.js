const { decodeSession } = require('../controllers/auth.controller');
const { getSupabase } = require('../config/supabase');

async function authenticate(req, _res, next) {
  try {
    const session = decodeSession(req);
    const supabase = getSupabase();
    const { data: user, error } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', session.sub)
      .maybeSingle();
    if (error) throw error;
    if (!user) {
      const missingUser = new Error('The account associated with this session could not be found.');
      missingUser.statusCode = 401;
      throw missingUser;
    }
    req.user = { sub: user.id, role: user.role };
    next();
  } catch (error) {
    next(error);
  }
}

function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const error = new Error('You do not have permission to perform this action.');
      error.statusCode = 403;
      return next(error);
    }
    return next();
  };
}

const allowRoles = requireRole;

module.exports = { authenticate, requireRole, allowRoles };
