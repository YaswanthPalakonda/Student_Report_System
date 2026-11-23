import { z } from 'zod';

export function getConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const secret = z.string().min(32).parse(env.JWT_SECRET);
  if (/^(change|replace|your[-_])/i.test(secret)) throw new Error('Configure a private JWT_SECRET.');
  const origins = (env.FRONTEND_URL || (production ? '' : 'http://localhost:5173')).split(',').map(s => s.trim()).filter(Boolean);
  if (!origins.length || origins.some(origin => {
    try { const url = new URL(origin); return url.origin !== origin || !['http:', 'https:'].includes(url.protocol) || (production && url.protocol !== 'https:'); }
    catch { return true; }
  })) throw new Error('FRONTEND_URL must contain exact allowed origins.');
  const sameSite = z.enum(['lax', 'strict', 'none']).parse(env.COOKIE_SAME_SITE || 'lax');
  if (sameSite === 'none' && !production) throw new Error('Cross-site cookies require production HTTPS.');
  return {
    production, secret, origins, sameSite,
    port: z.coerce.number().int().min(1).max(65535).parse(env.PORT || 5000),
    sessionHours: z.coerce.number().int().min(1).max(168).parse(env.SESSION_HOURS || 8),
    trustProxy: z.coerce.number().int().min(0).max(10).parse(env.TRUST_PROXY || 0),
    cookieName: production ? '__Host-srs_session' : 'srs_session',
  };
}
