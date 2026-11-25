import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError, unauthenticated } from '../utils/ApiError.js';
import { JWT_AUDIENCE, JWT_ISSUER, SESSION_COOKIE } from '../utils/constants.js';

export async function hashPassword(password) {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

function parseDurationToMs(value, fallbackMs) {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(String(value).trim());

  if (!match) {
    return fallbackMs;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

  return amount * multipliers[unit];
}

export function signSessionToken(user, rememberMe = false) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      tokenVersion: Number(user.tokenVersion || 0)
    },
    env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: rememberMe ? env.JWT_REMEMBER_EXPIRES_IN : env.JWT_EXPIRES_IN,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    }
  );
}

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/'
  };
}

export function setSessionCookie(res, token, rememberMe = false) {
  const options = baseCookieOptions();

  if (rememberMe) {
    options.maxAge = parseDurationToMs(env.JWT_REMEMBER_EXPIRES_IN, 30 * 86_400_000);
  }

  res.cookie(SESSION_COOKIE, token, options);
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, baseCookieOptions());
}

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.[SESSION_COOKIE];

    if (!token) {
      throw unauthenticated();
    }

    let payload;

    try {
      payload = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE
      });
    } catch {
      throw unauthenticated();
    }

    const user = await User.findById(payload.sub).select('+tokenVersion');

    if (!user || user.isActive === false) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Your session is no longer valid.');
    }

    if (Number(payload.tokenVersion || 0) !== Number(user.tokenVersion || 0)) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Your session is no longer valid. Please sign in again.');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
