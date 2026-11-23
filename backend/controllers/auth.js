import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'node:crypto';
import User from '../models/User.js';
import AuthSession from '../models/AuthSession.js';
import { HttpError, ok } from '../utils/errors.js';
import { userDTO } from '../utils/serializers.js';
import { cookieOptions, readCookie } from '../middleware/security.js';
const dummyHash = bcrypt.hashSync(randomBytes(32).toString('hex'), 12);
export function authController(config) {
  return {
    login: async (req, res) => {
      const user = await User.findOne({ email: req.input.email }).select('+passwordHash').populate('class');
      const valid = await bcrypt.compare(req.input.password, user?.passwordHash || dummyHash);
      if (!valid || !user?.active) throw new HttpError(401, 'Invalid email or password.');
      let previous;
      try { previous = jwt.verify(readCookie(req, config.cookieName) || '', config.secret, { algorithms: ['HS256'], issuer: 'student-report-system', audience: 'student-report-web' }); } catch { /* No valid prior session. */ }
      if (previous?.jti) await AuthSession.deleteOne({ _id: previous.jti, user: previous.sub });
      const session = await AuthSession.create({ _id: randomBytes(32).toString('hex'), user: user._id,
        csrf: randomBytes(32).toString('hex'), expiresAt: new Date(Date.now() + config.sessionHours * 3600000) });
      const token = jwt.sign({ version: user.authVersion }, config.secret, { algorithm: 'HS256', subject: String(user._id), jwtid: session._id,
        issuer: 'student-report-system', audience: 'student-report-web', expiresIn: `${config.sessionHours}h` });
      res.cookie(config.cookieName, token, cookieOptions(config));
      ok(res, { user: userDTO(user), csrfToken: session.csrf });
    },
    me: (req, res) => ok(res, { user: userDTO(req.user), csrfToken: req.session.csrf }),
    logout: async (req, res) => {
      await AuthSession.deleteOne({ _id: req.session._id });
      res.clearCookie(config.cookieName, cookieOptions(config)); ok(res, { loggedOut: true });
    },
  };
}
