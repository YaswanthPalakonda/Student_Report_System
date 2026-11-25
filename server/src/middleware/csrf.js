import crypto from 'node:crypto';

import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { CSRF_COOKIE, CSRF_HEADER } from '../utils/constants.js';

const CSRF_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function issueCsrfToken(req, res) {
  const token = crypto.randomBytes(32).toString('hex');

  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: CSRF_MAX_AGE_MS
  });

  res.status(200).json({
    data: {
      csrfToken: token
    }
  });
}

export function requireCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get(CSRF_HEADER);

  if (!cookieToken || !headerToken) {
    next(new ApiError(403, 'CSRF_TOKEN_MISSING', 'A valid CSRF token is required for this request.'));
    return;
  }

  const cookieBuffer = Buffer.from(String(cookieToken));
  const headerBuffer = Buffer.from(String(headerToken));

  if (
    cookieBuffer.length !== headerBuffer.length ||
    !crypto.timingSafeEqual(cookieBuffer, headerBuffer)
  ) {
    next(new ApiError(403, 'CSRF_TOKEN_INVALID', 'The CSRF token is invalid.'));
    return;
  }

  next();
}
