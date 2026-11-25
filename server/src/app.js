import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { connectDB, isDatabaseConnected } from './config/db.js';
import { env } from './config/env.js';
import { requireCsrf, issueCsrfToken } from './middleware/csrf.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import apiRoutes from './routes/index.js';
import { ApiError } from './utils/ApiError.js';

function buildCorsOptions(req, callback) {
  const allowedOrigins = new Set(env.clientOrigins);

  if (env.VERCEL_URL) {
    allowedOrigins.add(`https://${env.VERCEL_URL}`);
  }

  if (env.VERCEL_PROJECT_PRODUCTION_URL) {
    allowedOrigins.add(`https://${env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }

  const origin = req.get('Origin');
  const options = {
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token']
  };

  if (!origin) {
    callback(null, options);
    return;
  }

  const host = req.get('Host');
  const sameOrigin = host && origin === `${req.protocol}://${host}`;

  if (sameOrigin || allowedOrigins.has(origin)) {
    options.origin = origin;
    callback(null, options);
    return;
  }

  callback(new ApiError(403, 'CORS_ORIGIN_DENIED', 'The request origin is not allowed.'));
}

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.trustProxy ? 1 : false);

  app.use(helmet());
  app.use(cors(buildCorsOptions));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  if (!env.isTest) {
    app.use(morgan('tiny'));
  }

  // Public health check. It exposes no connection strings, secrets or environment values.
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      data: {
        status: 'ok',
        service: 'student-report-system-api',
        database: isDatabaseConnected() ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
      }
    });
  });

  // CSRF bootstrap for the browser. Returns a token and sets the readable
  // double-submit cookie that must be echoed in X-CSRF-Token.
  app.get('/api/auth/csrf', issueCsrfToken);

  // All state-changing API requests require a matching CSRF token.
  app.use('/api', requireCsrf);

  // Connect lazily and reuse the connection across warm serverless invocations.
  app.use('/api', (req, res, next) => {
    connectDB()
      .then(() => next())
      .catch(error => {
        console.error('[api] Database connection failed:', error.message);
        next(new ApiError(503, 'DATABASE_UNAVAILABLE', 'The database is temporarily unavailable.'));
      });
  });

  app.use('/api', apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
