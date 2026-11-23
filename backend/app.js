import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { getConfig } from './config/env.js';
import { originGuard } from './middleware/security.js';
import { errorHandler } from './middleware/errors.js';
import { apiRoutes } from './routes/api.js';
import { HttpError } from './utils/errors.js';

export function createApp(config = getConfig()) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);
  app.use(helmet());
  app.use(cors({ origin: (origin, cb) => cb(null, !origin || config.origins.includes(origin)), credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'], allowedHeaders: ['Content-Type', 'X-CSRF-Token'] }));
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.get('/api/health', (_req, res) => res.json({ success: true, message: 'Student Report System API is running', timestamp: new Date().toISOString() }));
  app.get('/api/ready', (_req, res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({ success: mongoose.connection.readyState === 1 }));
  app.use('/api', rateLimit({ windowMs: 60000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Try again shortly.' } }));
  app.use(express.json({ limit: '32kb' }));
  app.use('/api', originGuard(config), (_req, _res, next) => {
    if (mongoose.connection.readyState !== 1) throw new HttpError(503, 'Database is temporarily unavailable.');
    next();
  }, apiRoutes(config));
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'API route not found.')));
  app.use(errorHandler);
  return app;
}
