import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import { getConfig } from './config/env.js';
import { createApp } from './app.js';

let server;
let startupStage = 'configuration';
async function shutdown() {
  const deadline = setTimeout(() => process.exit(1), 10000).unref();
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  clearTimeout(deadline);
}
try {
  const config = getConfig();
  startupStage = 'database';
  await connectDB();
  startupStage = 'indexes';
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  startupStage = 'server';
  server = createApp(config).listen(config.port, () => console.log(`Backend listening on port ${config.port}`));
  server.on('error', async () => { console.error('HTTP server could not start. Check PORT availability.'); await shutdown(); process.exitCode = 1; });
  process.once('SIGINT', () => shutdown());
  process.once('SIGTERM', () => shutdown());
} catch (error) {
  console.error(startupStage === 'database' ? error.message : startupStage === 'indexes' ? 'Database indexes could not initialize. Check database permissions and conflicting existing records; no automatic migration was performed.' : 'Startup failed. Check required environment configuration and HTTP server settings.');
  await mongoose.disconnect();
  process.exitCode = 1;
}
