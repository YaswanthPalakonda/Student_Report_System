import { createApp } from '../server/src/app.js';

const app = createApp();

/**
 * Vercel Node.js function entry point.
 *
 * The Express application lives in server/src/app.js and is deliberately
 * separate from server/src/server.js, which is only the local listener.
 *
 * The Vercel Function may deliver the path either with or without the /api
 * prefix depending on the rewrite/capture used, so normalize it before Express
 * routes the request.
 */
export default function handler(req, res) {
  if (!req.url.startsWith('/api')) {
    req.url = req.url === '/' ? '/api' : `/api${req.url}`;
  }

  // Vercel may expose a lazily parsed body helper. If it parsed the JSON
  // successfully, tell Express's body parser to reuse it instead of reading an
  // already consumed stream. If parsing fails, leave it unset so Express emits
  // its normal validation error response.
  try {
    if (req.body !== undefined) {
      req._body = true;
    }
  } catch {
    // Ignore and let Express handle the malformed body.
  }

  return app(req, res);
}
