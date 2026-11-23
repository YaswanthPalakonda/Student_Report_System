import jwt from 'jsonwebtoken';
import { timingSafeEqual } from 'node:crypto';
import User from '../models/User.js';
import AuthSession from '../models/AuthSession.js';
import { HttpError } from '../utils/errors.js';

export function readCookie(req, name) {
  const value = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${name}=`));
  if (!value) return null;
  try { return decodeURIComponent(value.slice(name.length + 1)); } catch { return null; }
}
export function cookieOptions(config) { return { httpOnly: true, secure: config.production, sameSite: config.sameSite, path: '/' }; }
export function originGuard(config) {
  return (req, _res, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (!config.origins.includes(req.get('origin'))) throw new HttpError(403, 'Request origin is not allowed.');
      if (!req.is('application/json')) throw new HttpError(415, 'Use application/json.');
    }
    next();
  };
}
export function authenticate(config) {
  return async (req, _res, next) => {
    let claims;
    try { claims = jwt.verify(readCookie(req, config.cookieName) || '', config.secret, { algorithms: ['HS256'], issuer: 'student-report-system', audience: 'student-report-web' }); }
    catch { throw new HttpError(401, 'Please sign in again.'); }
    if (typeof claims.sub !== 'string' || !/^[a-f\d]{24}$/i.test(claims.sub) || typeof claims.jti !== 'string') throw new HttpError(401, 'Please sign in again.');
    const [session, user] = await Promise.all([
      AuthSession.findOne({ _id: claims.jti, user: claims.sub, expiresAt: { $gt: new Date() } }),
      User.findById(claims.sub).populate('class'),
    ]);
    if (!session || !user?.active || claims.version !== user.authVersion) throw new HttpError(401, 'Please sign in again.');
    req.user = user; req.session = session;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const actual = Buffer.from(req.get('x-csrf-token') || '');
      const expected = Buffer.from(session.csrf);
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new HttpError(403, 'Invalid request token. Refresh and try again.');
    }
    next();
  };
}
export const roles = (...allowed) => (req, _res, next) => {
  if (!allowed.includes(req.user.role)) throw new HttpError(403, 'Access denied.');
  next();
};
