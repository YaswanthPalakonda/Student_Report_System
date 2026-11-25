import { forbidden } from '../utils/ApiError.js';

export function requireRole(...allowedRoles) {
  return function roleGuard(req, res, next) {
    if (!req.user) {
      next(forbidden('Authentication is required.'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(forbidden('You do not have permission to perform this action.'));
      return;
    }

    next();
  };
}
