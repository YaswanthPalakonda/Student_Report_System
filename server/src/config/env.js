import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { z } from 'zod';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// In local development the backend reads server/.env.
// On Vercel, environment variables are injected by the platform.
dotenv.config({ path: path.join(serverRoot, '.env') });

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const optionalBoolean = z
  .enum(['true', 'false'])
  .optional()
  .transform(value => (value === undefined ? undefined : value === 'true'));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),

  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI is required')
    .refine(value => value.startsWith('mongodb://') || value.startsWith('mongodb+srv://'), {
      message: 'MONGODB_URI must be a MongoDB connection string'
    }),
  MONGODB_DB_NAME: z.string().trim().min(1).default('student_report_system'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().trim().min(1).default('8h'),
  JWT_REMEMBER_EXPIRES_IN: z.string().trim().min(1).default('30d'),

  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  VERCEL_URL: z.string().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),

  // Optional comma-separated DNS resolver override. Only needed in local
  // environments where Node's c-ares resolver cannot read the system DNS
  // configuration. Do not set this on Vercel.
  DNS_SERVERS: z.string().optional(),

  TRUST_PROXY: z.string().default('1'),
  COOKIE_SECURE: optionalBoolean,

  LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(15 * 60 * 1000),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10)
});

function formatIssues(error) {
  return error.issues.map(issue => `${issue.path.join('.') || 'environment'}: ${issue.message}`).join('; ');
}

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${formatIssues(parsed.error)}`);
}

const raw = parsed.data;
const normalizedNodeEnv = raw.NODE_ENV === 'test' ? 'test' : raw.NODE_ENV;

function parseDnsServers(value) {
  if (!value) {
    return [];
  }

  const servers = String(value)
    .split(',')
    .map(server => server.trim())
    .filter(Boolean);

  if (servers.some(server => net.isIP(server) === 0)) {
    throw new Error('Invalid environment configuration: DNS_SERVERS must be comma-separated IP addresses.');
  }

  return servers;
}

export const env = Object.freeze({
  ...raw,
  NODE_ENV: normalizedNodeEnv,
  isProduction: normalizedNodeEnv === 'production',
  isTest: normalizedNodeEnv === 'test',
  trustProxy: raw.TRUST_PROXY === 'true' || raw.TRUST_PROXY === '1',
  cookieSecure: raw.COOKIE_SECURE ?? normalizedNodeEnv === 'production',
  clientOrigins: raw.CLIENT_ORIGIN.split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
  dnsServers: parseDnsServers(raw.DNS_SERVERS)
});

const adminSeedSchema = z.object({
  ADMIN_NAME: z.string().trim().min(1).max(120),
  ADMIN_EMAIL: z.string().trim().toLowerCase().regex(emailPattern, 'ADMIN_EMAIL must be a valid email address'),
  ADMIN_PASSWORD: z
    .string()
    .min(12, 'ADMIN_PASSWORD must be at least 12 characters')
    .max(128, 'ADMIN_PASSWORD must be at most 128 characters'),
  ADMIN_RESET_PASSWORD: optionalBoolean
});

export function getAdminSeedConfig() {
  const result = adminSeedSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(`Invalid admin seed configuration: ${formatIssues(result.error)}`);
  }

  return {
    name: result.data.ADMIN_NAME,
    email: result.data.ADMIN_EMAIL,
    password: result.data.ADMIN_PASSWORD,
    resetPassword: result.data.ADMIN_RESET_PASSWORD
  };
}

export { serverRoot };
