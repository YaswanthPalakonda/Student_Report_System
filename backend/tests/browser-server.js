// Disposable browser-test fixture. This script never loads .env or connects to Atlas.
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app.js';
import { getConfig } from '../config/env.js';
import User from '../models/User.js';
if (!process.env.SRS_TEST_PASSWORD) throw new Error('Start with npm run test:e2e.');
const mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 }, binary: { downloadDir: fileURLToPath(new URL('../.mongodb-binaries', import.meta.url)) } });
await mongoose.connect(mongo.getUri(), { dbName: 'srs_browser_tests' });
await Promise.all(Object.values(mongoose.models).map(model => model.init()));
await User.create({ name: 'Browser Test Administrator', email: 'admin@example.test', role: 'admin', passwordHash: await bcrypt.hash(process.env.SRS_TEST_PASSWORD, 12) });
const app = express();
app.use(createApp(getConfig({ JWT_SECRET: randomBytes(32).toString('hex'), FRONTEND_URL: 'http://127.0.0.1:4173' })));
const dist = fileURLToPath(new URL('../../dist', import.meta.url));
app.use(express.static(dist));
app.get('/{*path}', (_req, res) => res.sendFile(`${dist}/index.html`));
const server = app.listen(4173, '127.0.0.1');
async function stop() { await new Promise(resolve => server.close(resolve)); await mongoose.disconnect(); await mongo.stop(); process.exit(0); }
process.once('SIGINT', stop); process.once('SIGTERM', stop);
