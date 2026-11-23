import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../app.js';
import { getConfig } from '../config/env.js';
import User from '../models/User.js';
import AuthSession from '../models/AuthSession.js';

test('isolated MongoDB API workflows and permission boundaries', { timeout: 900000 }, async t => {
  // Never reads .env, MONGODB_URI, or an external database. Only this disposable process is stopped.
  const temp = fileURLToPath(new URL('../../.test-artifacts/tmp', import.meta.url));
  mkdirSync(temp, { recursive: true });
  process.env.TEMP = temp; process.env.TMP = temp; process.env.TMPDIR = temp;
  const mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 60000 }, binary: { downloadDir: fileURLToPath(new URL('../.mongodb-binaries', import.meta.url)) } });
  let server;
  try {
    await mongoose.connect(mongo.getUri(), { dbName: 'srs_disposable_tests' });
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));
    const pass = randomBytes(18).toString('hex');
    const hash = await bcrypt.hash(pass, 12);
    await User.create({ name: 'Test Admin', email: 'admin@example.test', passwordHash: hash, role: 'admin' });
    const config = getConfig({ JWT_SECRET: randomBytes(32).toString('hex'), FRONTEND_URL: 'http://localhost:5173' });
    server = createApp(config).listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}/api`;
    function client() {
      return { cookie: '', csrf: '', async request(path, method = 'GET', body, extra = {}) {
        const response = await fetch(base + path, { method, headers: { Origin: config.origins[0], 'Content-Type': 'application/json', Cookie: this.cookie, 'X-CSRF-Token': this.csrf, ...extra }, ...(method !== 'GET' ? { body: JSON.stringify(body || {}) } : {}) });
        const data = await response.json();
        const cookie = response.headers.get('set-cookie');
        if (cookie) this.cookie = cookie.split(';')[0];
        if (data.data?.csrfToken) this.csrf = data.data.csrfToken;
        return { status: response.status, data: data.data, message: data.message, headers: response.headers };
      } };
    }
    const admin = client(), teacher = client(), student = client(), outsider = client(), student2 = client(), anonymous = client();
    const success = async (c, path, method, body, expected = 200) => {
      const result = await c.request(path, method, body); assert.equal(result.status, expected, `${method || 'GET'} ${path}: ${result.message}`); return result.data;
    };
    let cls, otherClass, subject, otherSubject, teacherUser, studentUser, assignment, record;
    await t.test('health, readiness, anonymous access, bad login, and secure session restoration', async () => {
      await success(anonymous, '/health'); await success(anonymous, '/ready');
      assert.equal((await anonymous.request('/users')).status, 401);
      assert.equal((await anonymous.request('/auth/login', 'POST', { email: 'admin@example.test', password: 'wrong' })).status, 401);
      const result = await admin.request('/auth/login', 'POST', { email: 'admin@example.test', password: pass });
      assert.equal(result.status, 200); assert.match(result.headers.get('set-cookie'), /HttpOnly/i);
      assert.equal(result.data.user.passwordHash, undefined);
      assert.equal((await success(admin, '/auth/me')).user.role, 'admin');
      assert.equal((await admin.request('/users', 'POST', {}, { Origin: 'https://evil.example' })).status, 403);
      assert.equal((await admin.request('/users', 'POST', {}, { 'X-CSRF-Token': 'wrong' })).status, 403);
    });
    await t.test('class/subject management, account validation and duplicate prevention', async () => {
      cls = await success(admin, '/classes', 'POST', { name: 'CSE A' }, 201);
      otherClass = await success(admin, '/classes', 'POST', { name: 'CSE B' }, 201);
      subject = await success(admin, '/subjects', 'POST', { name: 'Math' }, 201);
      otherSubject = await success(admin, '/subjects', 'POST', { name: 'Physics' }, 201);
      assert.equal((await admin.request('/classes', 'POST', { name: 'cse a' })).status, 409);
      await success(admin, `/subjects/${subject.id}`, 'PATCH', { name: 'Mathematics' });
      const make = (name, role, classId = null) => success(admin, '/users', 'POST', { name, email: `${name}@example.test`, role, password: pass, classId }, 201);
      teacherUser = await make('teacher', 'teacher'); studentUser = await make('student', 'student', cls.id);
      await make('outsider', 'teacher'); await make('student2', 'student', otherClass.id);
      assert.equal((await admin.request('/users', 'POST', { name: 'Bad', email: 'bad@example.test', role: 'admin', password: pass })).status, 400);
      assert.equal((await admin.request('/users', 'POST', { name: 'Duplicate', email: teacherUser.email, role: 'teacher', password: pass })).status, 409);
      const saved = await User.findById(teacherUser.id).select('+passwordHash'); assert.notEqual(saved.passwordHash, pass); assert.equal(await bcrypt.compare(pass, saved.passwordHash), true);
      for (const [c, email] of [[teacher, 'teacher'], [student, 'student'], [outsider, 'outsider'], [student2, 'student2']]) await success(c, '/auth/login', 'POST', { email: `${email}@example.test`, password: pass });
      assert.equal((await teacher.request('/users', 'POST', {})).status, 403);
      assert.equal((await student.request('/users')).status, 403);
    });
    await t.test('assignments restrict roster and mutations by class AND subject', async () => {
      assignment = await success(admin, '/assignments', 'POST', { teacherId: teacherUser.id, classId: cls.id, subjectId: subject.id }, 201);
      assert.equal((await admin.request('/assignments', 'POST', { teacherId: teacherUser.id, classId: cls.id, subjectId: subject.id })).status, 409);
      assert.equal((await success(teacher, '/teacher/students')).length, 1);
      assert.equal((await success(outsider, '/teacher/students')).length, 0);
      assert.equal((await success(teacher, '/subjects'))[0].id, subject.id);
      const body = { studentId: studentUser.id, subjectId: subject.id, testMarks: 20, examMarks: 25, attendance: 90, attendanceStatus: 'Present', remarks: 'Keep practicing' };
      assert.equal((await outsider.request('/reports', 'POST', body)).status, 403);
      assert.equal((await teacher.request('/reports', 'POST', { ...body, subjectId: otherSubject.id })).status, 403);
      assert.equal((await teacher.request('/reports', 'POST', { ...body, testMarks: 41 })).status, 400);
      assert.equal((await student.request('/reports', 'POST', body)).status, 403);
      record = await success(teacher, '/reports', 'POST', body, 201);
      assert.equal(record.grade, 'F'); assert.equal(record.result, 'Pass');
      assert.equal((await teacher.request('/reports', 'POST', body)).status, 409);
    });
    await t.test('independent clients share marks, attendance and reports; students stay isolated', async () => {
      assert.equal((await success(student, '/reports'))[0].marks, 45);
      assert.equal((await success(student2, '/reports')).length, 0);
      assert.equal((await student2.request(`/reports/${record.id}`)).status, 404);
      assert.equal((await outsider.request(`/reports/${record.id}`)).status, 404);
      const body = { studentId: studentUser.id, subjectId: subject.id, testMarks: 35, examMarks: 55, attendance: 85, attendanceStatus: 'Late', remarks: 'Improved', revision: record.revision };
      record = await success(teacher, `/reports/${record.id}`, 'PATCH', body);
      assert.equal((await teacher.request(`/reports/${record.id}`, 'PATCH', body)).status, 409);
      assert.equal((await success(student, '/reports'))[0].attendance, 85);
      assert.equal((await success(admin, '/reports'))[0].grade, 'A+');
      assert.equal((await success(student, '/student/summary')).gpa, '9.00');
      assert.equal((await success(admin, '/admin/dashboard')).reports, 1);
      assert.equal((await student.request(`/reports/${record.id}`, 'DELETE')).status, 403);
    });
    await t.test('grading changes are validated and preserve saved report grades', async () => {
      const settings = await success(admin, '/grading-settings');
      const changed = await success(admin, '/grading-settings', 'PUT', { ...settings, passMark: 95 });
      assert.equal((await admin.request('/grading-settings', 'PUT', settings)).status, 409);
      assert.equal(changed.passMark, 95);
      assert.equal((await success(student, '/reports'))[0].result, 'Pass');
      assert.equal((await teacher.request('/grading-settings', 'PUT', changed)).status, 403);
    });
    await t.test('user edits preserve relationships and revoke sessions; referenced catalogs cannot be deleted', async () => {
      const changed = await success(admin, `/users/${studentUser.id}`, 'PATCH', { name: 'Student Updated', email: 'updated@example.test', role: 'student', classId: cls.id, studentId: 'S-1', revision: studentUser.revision });
      assert.equal(changed.email, 'updated@example.test');
      assert.equal((await student.request('/auth/me')).status, 401);
      await success(student, '/auth/login', 'POST', { email: 'updated@example.test', password: pass });
      assert.equal((await success(student, '/reports'))[0].studentName, 'Student Updated');
      assert.equal((await success(admin, '/users?search=updated&role=student')).length, 1);
      assert.equal((await admin.request(`/classes/${cls.id}`, 'DELETE')).status, 409);
      assert.equal((await admin.request(`/subjects/${subject.id}`, 'DELETE')).status, 409);
    });
    await t.test('removed assignments revoke access, logout rejects replay, deactivation revokes sessions', async () => {
      await success(admin, `/assignments/${assignment.id}`, 'DELETE');
      assert.equal((await teacher.request(`/reports/${record.id}`)).status, 404);
      const replay = teacher.cookie;
      await success(teacher, '/auth/logout', 'POST'); teacher.cookie = replay;
      assert.equal((await teacher.request('/auth/me')).status, 401);
      await success(admin, `/users/${teacherUser.id}`, 'DELETE');
      assert.equal((await teacher.request('/auth/login', 'POST', { email: 'teacher@example.test', password: pass })).status, 401);
      await success(admin, `/reports/${record.id}`, 'DELETE');
      assert.equal((await success(student, '/reports')).length, 0);
      const disposable = await success(admin, '/subjects', 'POST', { name: 'Disposable' }, 201);
      await success(admin, `/subjects/${disposable.id}`, 'DELETE');
      await AuthSession.updateMany({ user: (await User.findOne({ email: 'updated@example.test' }))._id }, { expiresAt: new Date(0) });
      assert.equal((await student.request('/auth/me')).status, 401);
    });
    await t.test('login rate limit rejects repeated failures', async () => {
      let response;
      for (let n = 0; n < 21; n++) { response = await anonymous.request('/auth/login', 'POST', { email: 'missing@example.test', password: 'wrong' }); if (response.status === 429) break; }
      assert.equal(response.status, 429);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await mongoose.disconnect(); await mongo.stop();
  }
});
