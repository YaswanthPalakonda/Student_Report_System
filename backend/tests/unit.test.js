import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { connectionURI, connectionError } from '../config/connection.js';
import { getConfig } from '../config/env.js';
import { calculateReport, summarize } from '../utils/grading.js';
import { report, grading, createUser } from '../validators/index.js';
import { createApp } from '../app.js';

test('grading retains 40/60 boundaries, F/pass behavior and GPA', () => {
  assert.deepEqual(calculateReport(20, 25), { marks: 45, percentage: 45, grade: 'F', result: 'Pass' });
  assert.equal(calculateReport(40, 60).grade, 'A+');
  assert.equal(calculateReport(20, 19).result, 'Fail');
  assert.equal(summarize([{ marks: 80, attendance: 90, result: 'Pass' }]).gpa, '8.00');
  assert.equal(summarize([]).subjects, 0);
});
test('URI construction encodes separate credentials and preserves embedded credentials', () => {
  assert.equal(connectionURI({ MONGODB_URI: 'mongodb+srv://cluster.example/db', MONGODB_USERNAME: 'user@name', MONGODB_PASSWORD: 'p:/@' }), 'mongodb+srv://user%40name:p%3A%2F%40@cluster.example/db');
  assert.equal(connectionURI({ MONGODB_URI: 'mongodb://test:test@localhost/db', MONGODB_USERNAME: 'ignored' }), 'mongodb://test:test@localhost/db');
  assert.throws(() => connectionURI({}));
});
test('database failures are classified without leaking raw errors', () => {
  assert.match(connectionError({ message: 'querySrv ECONNREFUSED secret-host' }), /DNS/);
  assert.match(connectionError({ code: 18, message: 'private-password' }), /authentication/);
  assert.match(connectionError({ name: 'MongoServerSelectionError' }), /network/);
  assert.doesNotMatch(connectionError({ message: 'private-password' }), /private-password/);
});
test('validation rejects forged roles, calculated fields, invalid marks and grading gaps', () => {
  assert.equal(createUser.safeParse({ name: 'A', email: 'a@example.test', password: 'long-password', role: 'admin' }).success, false);
  const valid = { studentId: 'a'.repeat(24), subjectId: 'b'.repeat(24), testMarks: 40, examMarks: 60, attendance: 90, attendanceStatus: 'Present' };
  assert.equal(report.safeParse(valid).success, true);
  for (const change of [{ testMarks: 41 }, { examMarks: -1 }, { attendance: 101 }, { attendance: NaN }, { marks: 100 }]) assert.equal(report.safeParse({ ...valid, ...change }).success, false);
  assert.equal(grading.safeParse({ passMark: 40, grades: [{ label: 'A', min: 90 }, { label: 'F', min: 10 }], revision: -1 }).success, false);
});
test('production configuration rejects weak secrets and insecure origins', () => {
  assert.throws(() => getConfig({ JWT_SECRET: 'weak' }));
  assert.throws(() => getConfig({ JWT_SECRET: randomBytes(32).toString('hex'), NODE_ENV: 'production', FRONTEND_URL: 'http://example.com' }));
});
test('health works without MongoDB; readiness and dependent operations fail safely', async () => {
  const app = createApp(getConfig({ JWT_SECRET: randomBytes(32).toString('hex') }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(`${base}/api/health`)).status, 200);
    assert.equal((await fetch(`${base}/api/ready`)).status, 503);
    assert.equal((await fetch(`${base}/api/reports`)).status, 503);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
