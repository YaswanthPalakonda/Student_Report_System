import { defineConfig } from '@playwright/test';
import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const temp = fileURLToPath(new URL('./.test-artifacts/tmp', import.meta.url));
mkdirSync(temp, { recursive: true });
process.env.TEMP = temp; process.env.TMP = temp; process.env.TMPDIR = temp;
process.env.SRS_TEST_PASSWORD ||= randomBytes(18).toString('hex');
export default defineConfig({
  testDir: './tests/e2e', timeout: 240000, expect: { timeout: 30000 }, workers: 1, reporter: 'list',
  outputDir: '.test-artifacts/playwright',
  use: { baseURL: 'http://127.0.0.1:4173', channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge', headless: true, actionTimeout: 30000, viewport: { width: 1440, height: 1000 } },
  webServer: { command: 'node backend/tests/browser-server.js', url: 'http://127.0.0.1:4173/api/ready', reuseExistingServer: false, timeout: 180000 },
});
