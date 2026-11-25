import dns from 'node:dns';

import mongoose from 'mongoose';

import { env } from './env.js';
import { GradingPolicy } from '../models/GradingPolicy.js';
import { Report } from '../models/Report.js';
import { TeacherAssignment } from '../models/TeacherAssignment.js';
import { User } from '../models/User.js';
import { ensureDefaultGradingPolicy } from '../services/gradingService.js';

// Local-only escape hatch for machines where Node's c-ares resolver cannot read
// the operating system DNS configuration. Unset on Vercel and in tests.
if (env.dnsServers.length > 0) {
  dns.setServers(env.dnsServers);
}

let connectionPromise = null;

mongoose.connection.on('disconnected', () => {
  connectionPromise = null;
});

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

export async function connectDB() {
  if (isDatabaseConnected()) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = mongoose
    .connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB_NAME,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
      bufferCommands: false
    })
    .then(async () => {
      await ensureDefaultGradingPolicy();
      await Promise.all([User.init(), Report.init(), TeacherAssignment.init(), GradingPolicy.init()]);
      return mongoose.connection;
    })
    .catch(error => {
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
}

export async function disconnectDB() {
  connectionPromise = null;

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
