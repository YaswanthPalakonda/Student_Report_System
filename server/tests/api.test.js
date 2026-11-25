import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, it } from 'node:test';

import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

const ADMIN_EMAIL = 'admin@test.com';
const ADMIN_PASSWORD = 'AdminPass123!';
const DEFAULT_PASSWORD = 'Password123!';

let mongoServer;
let app;
let User;
let Report;
let TeacherAssignment;
let GradingPolicy;
let ensureDefaultGradingPolicy;
let disconnectDB;
let adminUser;

function csrfRequest(req, token) {
  return req.set('X-CSRF-Token', token);
}

async function seedUser({
  role,
  email,
  name,
  className = '',
  studentId = '',
  password = DEFAULT_PASSWORD,
  isActive = true
}) {
  return User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 4),
    role,
    className,
    studentId,
    isActive
  });
}

async function loginAgent(email, password = DEFAULT_PASSWORD) {
  const agent = request.agent(app);
  const csrfResponse = await agent.get('/api/auth/csrf');

  assert.equal(csrfResponse.status, 200, 'CSRF bootstrap should succeed');

  const csrf = csrfResponse.body.data.csrfToken;
  const response = await csrfRequest(agent.post('/api/auth/login'), csrf).send({ email, password });

  return { agent, csrf, response };
}

async function loginAdmin() {
  return loginAgent(ADMIN_EMAIL, ADMIN_PASSWORD);
}

async function seedClassroom() {
  const teacher = await seedUser({
    role: 'teacher',
    email: 'teacher1@test.com',
    name: 'Teacher One'
  });
  const otherTeacher = await seedUser({
    role: 'teacher',
    email: 'teacher2@test.com',
    name: 'Teacher Two'
  });
  const studentA = await seedUser({
    role: 'student',
    email: 'alice@test.com',
    name: 'Alice Anderson',
    className: 'Class A',
    studentId: 'S-A-001'
  });
  const studentB = await seedUser({
    role: 'student',
    email: 'bob@test.com',
    name: 'Bob Brown',
    className: 'Class B',
    studentId: 'S-B-001'
  });
  const classlessStudent = await seedUser({
    role: 'student',
    email: 'classless@test.com',
    name: 'Classless Student'
  });

  const assignment = await TeacherAssignment.create({
    teacher: teacher._id,
    teacherEmail: teacher.email,
    teacherName: teacher.name,
    className: 'Class A',
    subject: 'Mathematics'
  });

  return {
    teacher,
    otherTeacher,
    studentA,
    studentB,
    classlessStudent,
    assignment
  };
}

async function createAdminSession() {
  const session = await loginAdmin();
  assert.equal(session.response.status, 200, 'Admin login should succeed');
  return session;
}

async function createReportViaApi(session, student, overrides = {}) {
  return csrfRequest(session.agent.post('/api/reports'), session.csrf).send({
    studentUserId: student._id.toString(),
    subject: 'Mathematics',
    testMarks: 32,
    examMarks: 48,
    attendance: 90,
    attendanceStatus: 'Present',
    remarks: 'Good progress',
    ...overrides
  });
}

before(async () => {
  process.env.NODE_ENV = 'test';
  process.env.MONGODB_DB_NAME = 'student_report_system_test';
  process.env.JWT_SECRET = 'test-only-jwt-secret-value-with-32-plus-characters';
  process.env.BCRYPT_ROUNDS = '4';
  process.env.TRUST_PROXY = '0';
  process.env.LOGIN_RATE_LIMIT_MAX = '1000';
  process.env.CLIENT_ORIGIN = 'http://localhost:5173';

  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();

  const dbModule = await import('../src/config/db.js');
  await dbModule.connectDB();
  disconnectDB = dbModule.disconnectDB;

  const appModule = await import('../src/app.js');
  app = appModule.createApp();

  ({ User } = await import('../src/models/User.js'));
  ({ Report } = await import('../src/models/Report.js'));
  ({ TeacherAssignment } = await import('../src/models/TeacherAssignment.js'));
  ({ GradingPolicy } = await import('../src/models/GradingPolicy.js'));
  ({ ensureDefaultGradingPolicy } = await import('../src/services/gradingService.js'));
});

after(async () => {
  await disconnectDB?.();
  await mongoServer?.stop();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Report.deleteMany({}),
    TeacherAssignment.deleteMany({}),
    GradingPolicy.deleteMany({})
  ]);

  await ensureDefaultGradingPolicy();

  adminUser = await seedUser({
    role: 'admin',
    email: ADMIN_EMAIL,
    name: 'System Administrator',
    password: ADMIN_PASSWORD
  });
});

describe('health and CSRF', () => {
  it('exposes a public health endpoint without secrets', async () => {
    const response = await request(app).get('/api/health');

    assert.equal(response.status, 200);
    assert.equal(response.body.data.status, 'ok');
    assert.equal(response.body.data.service, 'student-report-system-api');
    assert.equal(response.body.data.database, 'connected');

    const serialized = JSON.stringify(response.body);
    assert.equal(serialized.includes('mongodb://'), false);
    assert.equal(serialized.includes('JWT_SECRET'), false);
    assert.equal(serialized.includes('test-only-jwt-secret'), false);
  });

  it('requires a matching CSRF token for login and state-changing requests', async () => {
    const agent = request.agent(app);

    const missing = await agent.post('/api/auth/login').send({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    assert.equal(missing.status, 403);
    assert.equal(missing.body.error.code, 'CSRF_TOKEN_MISSING');

    const csrfResponse = await agent.get('/api/auth/csrf');
    const csrf = csrfResponse.body.data.csrfToken;

    const wrong = await agent
      .post('/api/auth/login')
      .set('X-CSRF-Token', 'wrong-token')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    assert.equal(wrong.status, 403);
    assert.equal(wrong.body.error.code, 'CSRF_TOKEN_INVALID');

    const success = await csrfRequest(agent.post('/api/auth/login'), csrf).send({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    assert.equal(success.status, 200);

    const noHeader = await agent.post('/api/users').send({
      name: 'No CSRF',
      email: 'nocsrf@test.com',
      password: DEFAULT_PASSWORD,
      role: 'student'
    });
    assert.equal(noHeader.status, 403);
    assert.equal(noHeader.body.error.code, 'CSRF_TOKEN_MISSING');
  });
});

describe('authentication', () => {
  it('logs in, rehydrates the session, sanitizes the user and logs out', async () => {
    const { agent, csrf, response } = await loginAdmin();

    assert.equal(response.status, 200);
    assert.equal(response.body.data.user.role, 'admin');
    assert.equal(response.body.data.user.email, ADMIN_EMAIL);
    assert.equal('password' in response.body.data.user, false);
    assert.equal('passwordHash' in response.body.data.user, false);

    const me = await agent.get('/api/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.data.user.id, adminUser._id.toString());
    assert.equal('passwordHash' in me.body.data.user, false);

    const logout = await csrfRequest(agent.post('/api/auth/logout'), csrf);
    assert.equal(logout.status, 200);

    const afterLogout = await agent.get('/api/auth/me');
    assert.equal(afterLogout.status, 401);
  });

  it('rejects wrong passwords and normalizes email case', async () => {
    const wrong = await loginAgent(ADMIN_EMAIL, 'WrongPassword!');
    assert.equal(wrong.response.status, 401);
    assert.equal(wrong.response.body.error.code, 'INVALID_CREDENTIALS');

    const upperCase = await loginAgent('ADMIN@TEST.COM', ADMIN_PASSWORD);
    assert.equal(upperCase.response.status, 200);
  });

  it('rejects unauthenticated and wrong-role access', async () => {
    const anonymousUsers = await request(app).get('/api/users');
    assert.equal(anonymousUsers.status, 401);

    const anonymousReports = await request(app).get('/api/reports');
    assert.equal(anonymousReports.status, 401);

    const { teacher } = await seedClassroom();
    const teacherSession = await loginAgent(teacher.email);

    const teacherUsers = await teacherSession.agent.get('/api/users');
    assert.equal(teacherUsers.status, 403);

    const teacherAdminOverview = await teacherSession.agent.get('/api/admin/overview');
    assert.equal(teacherAdminOverview.status, 403);

    const student = await seedUser({
      role: 'student',
      email: 'rolecheck@test.com',
      name: 'Role Check',
      className: 'Class A'
    });
    const studentSession = await loginAgent(student.email);

    const studentUsers = await studentSession.agent.get('/api/users');
    assert.equal(studentUsers.status, 403);

    const studentAdminOverview = await studentSession.agent.get('/api/admin/overview');
    assert.equal(studentAdminOverview.status, 403);

    const adminSession = await createAdminSession();
    const adminTeacherOverview = await adminSession.agent.get('/api/teacher/overview');
    assert.equal(adminTeacherOverview.status, 403);
  });
});

describe('admin user management', () => {
  it('creates, lists, updates and deletes users while rejecting duplicate emails', async () => {
    const session = await createAdminSession();

    const teacherResponse = await csrfRequest(session.agent.post('/api/users'), session.csrf).send({
      name: 'New Teacher',
      email: 'new.teacher@test.com',
      password: DEFAULT_PASSWORD,
      role: 'teacher',
      className: '',
      studentId: ''
    });
    assert.equal(teacherResponse.status, 201);
    assert.equal('passwordHash' in teacherResponse.body.data.user, false);

    const studentResponse = await csrfRequest(session.agent.post('/api/users'), session.csrf).send({
      name: 'New Student',
      email: 'new.student@test.com',
      password: DEFAULT_PASSWORD,
      role: 'student',
      className: 'Class A',
      studentId: 'S-NEW-1'
    });
    assert.equal(studentResponse.status, 201);

    const duplicate = await csrfRequest(session.agent.post('/api/users'), session.csrf).send({
      name: 'Duplicate',
      email: 'NEW.STUDENT@TEST.COM',
      password: DEFAULT_PASSWORD,
      role: 'student'
    });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.message, 'Email already exists.');

    const weakPassword = await csrfRequest(session.agent.post('/api/users'), session.csrf).send({
      name: 'Weak',
      email: 'weak@test.com',
      password: '123',
      role: 'student'
    });
    assert.equal(weakPassword.status, 422);

    const adminRole = await csrfRequest(session.agent.post('/api/users'), session.csrf).send({
      name: 'Another Admin',
      email: 'admin2@test.com',
      password: DEFAULT_PASSWORD,
      role: 'admin'
    });
    assert.equal(adminRole.status, 422);

    const list = await session.agent.get('/api/users');
    assert.equal(list.status, 200);
    assert.equal(list.body.data.count, 2);
    assert.equal(list.body.data.users.some(user => user.role === 'admin'), false);

    const filtered = await session.agent.get('/api/users?role=teacher&search=new.teacher');
    assert.equal(filtered.body.data.count, 1);

    const update = await csrfRequest(
      session.agent.patch(`/api/users/${studentResponse.body.data.user.id}`),
      session.csrf
    ).send({ name: 'Updated Student', className: 'Class B', password: 'NewPassword123!' });
    assert.equal(update.status, 200);
    assert.equal(update.body.data.user.name, 'Updated Student');
    assert.equal(update.body.data.user.className, 'Class B');

    const deleteResponse = await csrfRequest(
      session.agent.delete(`/api/users/${teacherResponse.body.data.user.id}`),
      session.csrf
    );
    assert.equal(deleteResponse.status, 200);
  });

  it('invalidates sessions when a password changes', async () => {
    const teacher = await seedUser({
      role: 'teacher',
      email: 'reset.me@test.com',
      name: 'Reset Me'
    });
    const teacherSession = await loginAgent(teacher.email);
    assert.equal(teacherSession.response.status, 200);

    const adminSession = await createAdminSession();
    const reset = await csrfRequest(
      adminSession.agent.patch(`/api/users/${teacher._id.toString()}`),
      adminSession.csrf
    ).send({ password: 'BrandNewPass123!' });
    assert.equal(reset.status, 200);

    const oldSession = await teacherSession.agent.get('/api/auth/me');
    assert.equal(oldSession.status, 401);

    const newLogin = await loginAgent(teacher.email, 'BrandNewPass123!');
    assert.equal(newLogin.response.status, 200);
  });

  it('invalidates sessions when an account is deactivated and blocks future login', async () => {
    const teacher = await seedUser({
      role: 'teacher',
      email: 'deactivate.me@test.com',
      name: 'Deactivate Me'
    });
    const teacherSession = await loginAgent(teacher.email);

    const adminSession = await createAdminSession();
    const deactivate = await csrfRequest(
      adminSession.agent.patch(`/api/users/${teacher._id.toString()}`),
      adminSession.csrf
    ).send({ isActive: false });
    assert.equal(deactivate.status, 200);
    assert.equal(deactivate.body.data.user.isActive, false);

    const oldSession = await teacherSession.agent.get('/api/auth/me');
    assert.equal(oldSession.status, 401);

    const blockedLogin = await loginAgent(teacher.email);
    assert.equal(blockedLogin.response.status, 401);
  });

  it('invalidates sessions on deletion and preserves historical reports', async () => {
    const { teacher, studentA, assignment } = await seedClassroom();
    const teacherSession = await loginAgent(teacher.email);
    const created = await createReportViaApi(teacherSession, studentA);
    assert.equal(created.status, 201);

    const adminSession = await createAdminSession();
    const deleted = await csrfRequest(
      adminSession.agent.delete(`/api/users/${teacher._id.toString()}`),
      adminSession.csrf
    );
    assert.equal(deleted.status, 200);

    const oldSession = await teacherSession.agent.get('/api/auth/me');
    assert.equal(oldSession.status, 401);

    assert.equal(await TeacherAssignment.countDocuments({ _id: assignment._id }), 0);
    assert.equal(await Report.countDocuments({}), 1);

    const reports = await adminSession.agent.get('/api/reports');
    assert.equal(reports.status, 200);
    assert.equal(reports.body.data.reports.length, 1);
    assert.equal(reports.body.data.reports[0].teacherName, 'Teacher One');
  });

  it('does not allow deleting or modifying an administrator through the API', async () => {
    const session = await createAdminSession();

    const deleteAdmin = await csrfRequest(
      session.agent.delete(`/api/users/${adminUser._id.toString()}`),
      session.csrf
    );
    assert.equal(deleteAdmin.status, 403);

    const patchAdmin = await csrfRequest(
      session.agent.patch(`/api/users/${adminUser._id.toString()}`),
      session.csrf
    ).send({ name: 'Compromised Admin' });
    assert.equal(patchAdmin.status, 403);
  });
});

describe('teacher assignments', () => {
  it('creates assignments, rejects duplicates and removes them', async () => {
    const { teacher } = await seedClassroom();
    const session = await createAdminSession();

    const duplicate = await csrfRequest(session.agent.post('/api/assignments'), session.csrf).send({
      teacherId: teacher._id.toString(),
      className: 'class a',
      subject: 'mathematics'
    });
    assert.equal(duplicate.status, 409);

    const created = await csrfRequest(session.agent.post('/api/assignments'), session.csrf).send({
      teacherId: teacher._id.toString(),
      className: 'Class A',
      subject: 'Physics'
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.assignment.teacherName, 'Teacher One');

    const list = await session.agent.get('/api/assignments');
    assert.equal(list.status, 200);
    assert.equal(list.body.data.count, 2);

    const teacherSession = await loginAgent(teacher.email);
    const ownAssignments = await teacherSession.agent.get('/api/assignments');
    assert.equal(ownAssignments.body.data.count, 2);

    const removed = await csrfRequest(
      session.agent.delete(`/api/assignments/${created.body.data.assignment.id}`),
      session.csrf
    );
    assert.equal(removed.status, 200);

    const afterRemoval = await session.agent.get('/api/assignments');
    assert.equal(afterRemoval.body.data.count, 1);
  });

  it('refuses assignments for non-teacher accounts', async () => {
    const { studentA } = await seedClassroom();
    const session = await createAdminSession();

    const response = await csrfRequest(session.agent.post('/api/assignments'), session.csrf).send({
      teacherId: studentA._id.toString(),
      className: 'Class A',
      subject: 'Mathematics'
    });
    assert.equal(response.status, 422);
    assert.equal(response.body.error.code, 'INVALID_TEACHER');
  });

  it('only exposes assigned students to teachers', async () => {
    const { teacher, studentA } = await seedClassroom();
    const session = await loginAgent(teacher.email);

    const students = await session.agent.get('/api/teacher/students');
    assert.equal(students.status, 200);
    assert.equal(students.body.data.students.length, 1);
    assert.equal(students.body.data.students[0].id, studentA._id.toString());

    const forbiddenClass = await session.agent.get('/api/teacher/students?className=Class%20B');
    assert.equal(forbiddenClass.status, 403);

    const roster = await session.agent.get('/api/teacher/roster');
    assert.equal(roster.status, 200);
    assert.equal(roster.body.data.students.length, 1);
  });
});

describe('reports and teacher authorization', () => {
  it('creates authorized reports with server-side grade and result calculations', async () => {
    const { teacher, studentA } = await seedClassroom();
    const session = await loginAgent(teacher.email);

    const created = await createReportViaApi(session, studentA);
    assert.equal(created.status, 201);

    const report = created.body.data.report;
    assert.equal(report.marks, 80);
    assert.equal(report.percentage, 80);
    assert.equal(report.grade, 'A');
    assert.equal(report.result, 'Pass');
    assert.equal(report.studentUserId, studentA._id.toString());
    assert.equal(report.teacherEmail, teacher.email);
    assert.equal(report.attendanceStatus, 'Present');
    assert.equal('passwordHash' in report, false);

    const wrongSubject = await createReportViaApi(session, studentA, { subject: 'Science' });
    assert.equal(wrongSubject.status, 403);

    const wrongClassStudent = await createReportViaApi(session, (await User.findOne({ email: 'bob@test.com' })));
    assert.equal(wrongClassStudent.status, 403);

    const classless = await User.findOne({ email: 'classless@test.com' });
    const classlessAttempt = await createReportViaApi(session, classless);
    assert.equal(classlessAttempt.status, 403);
  });

  it('validates marks, attendance, status and subject', async () => {
    const { teacher, studentA } = await seedClassroom();
    const session = await loginAgent(teacher.email);

    const cases = [
      { testMarks: 41 },
      { examMarks: 61 },
      { attendance: 101 },
      { attendanceStatus: 'Unknown' },
      { subject: '' }
    ];

    for (const overrides of cases) {
      const response = await createReportViaApi(session, studentA, overrides);
      assert.equal(response.status, 422, `Expected validation failure for ${JSON.stringify(overrides)}`);
      assert.equal(response.body.error.code, 'VALIDATION_ERROR');
    }
  });

  it('restricts report creation to teachers and report edits to the owning teacher', async () => {
    const { teacher, otherTeacher, studentA } = await seedClassroom();

    await TeacherAssignment.create({
      teacher: otherTeacher._id,
      teacherEmail: otherTeacher.email,
      teacherName: otherTeacher.name,
      className: 'Class A',
      subject: 'Mathematics'
    });

    const teacherSession = await loginAgent(teacher.email);
    const created = await createReportViaApi(teacherSession, studentA);
    assert.equal(created.status, 201);
    const reportId = created.body.data.report.id;

    const otherSession = await loginAgent(otherTeacher.email);
    const forbiddenEdit = await csrfRequest(
      otherSession.agent.patch(`/api/reports/${reportId}`),
      otherSession.csrf
    ).send({ remarks: 'Hijacked' });
    assert.equal(forbiddenEdit.status, 404);

    const ownEdit = await csrfRequest(
      teacherSession.agent.patch(`/api/reports/${reportId}`),
      teacherSession.csrf
    ).send({ testMarks: 40, examMarks: 60, attendance: 95 });
    assert.equal(ownEdit.status, 200);
    assert.equal(ownEdit.body.data.report.marks, 100);
    assert.equal(ownEdit.body.data.report.grade, 'A+');
    assert.equal(ownEdit.body.data.report.result, 'Pass');

    const unauthorizedSubjectEdit = await csrfRequest(
      teacherSession.agent.patch(`/api/reports/${reportId}`),
      teacherSession.csrf
    ).send({ subject: 'Science' });
    assert.equal(unauthorizedSubjectEdit.status, 403);

    const student = await seedUser({
      role: 'student',
      email: 'cannot.create@test.com',
      name: 'Cannot Create',
      className: 'Class A'
    });
    const studentSession = await loginAgent(student.email);
    const studentCreate = await csrfRequest(studentSession.agent.post('/api/reports'), studentSession.csrf).send({
      studentUserId: student._id.toString(),
      subject: 'Mathematics',
      testMarks: 10,
      examMarks: 10,
      attendance: 50,
      attendanceStatus: 'Present'
    });
    assert.equal(studentCreate.status, 403);

    const adminSession = await createAdminSession();
    const adminCreate = await csrfRequest(adminSession.agent.post('/api/reports'), adminSession.csrf).send({
      studentUserId: studentA._id.toString(),
      subject: 'Mathematics',
      testMarks: 10,
      examMarks: 10,
      attendance: 50,
      attendanceStatus: 'Present'
    });
    assert.equal(adminCreate.status, 403);
  });

  it('scopes report reads by role and hides other students reports', async () => {
    const { teacher, studentA, studentB } = await seedClassroom();
    const teacherSession = await loginAgent(teacher.email);
    const created = await createReportViaApi(teacherSession, studentA);
    const reportId = created.body.data.report.id;

    const studentASession = await loginAgent(studentA.email);
    const ownReports = await studentASession.agent.get('/api/reports');
    assert.equal(ownReports.status, 200);
    assert.equal(ownReports.body.data.reports.length, 1);

    const ownReport = await studentASession.agent.get(`/api/reports/${reportId}`);
    assert.equal(ownReport.status, 200);

    const studentBSession = await loginAgent(studentB.email);
    const otherReport = await studentBSession.agent.get(`/api/reports/${reportId}`);
    assert.equal(otherReport.status, 404);

    const otherReports = await studentBSession.agent.get('/api/reports');
    assert.equal(otherReports.body.data.reports.length, 0);

    const adminSession = await createAdminSession();
    const allReports = await adminSession.agent.get('/api/reports');
    assert.equal(allReports.body.data.reports.length, 1);

    const teacherReports = await teacherSession.agent.get('/api/reports');
    assert.equal(teacherReports.body.data.reports.length, 1);
  });

  it('supports report search, result filters and invalid id handling', async () => {
    const { teacher, studentA } = await seedClassroom();
    const session = await loginAgent(teacher.email);
    await createReportViaApi(session, studentA);

    const search = await session.agent.get('/api/reports?search=alice');
    assert.equal(search.status, 200);
    assert.equal(search.body.data.count, 1);

    const filtered = await session.agent.get('/api/reports?result=Fail');
    assert.equal(filtered.body.data.count, 0);

    const invalidFilter = await session.agent.get('/api/reports?result=Unknown');
    assert.equal(invalidFilter.status, 422);

    const invalidId = await session.agent.get('/api/reports/not-an-id');
    assert.equal(invalidId.status, 400);
  });
});

describe('grading policy', () => {
  it('is readable by roles, writable only by admins and validates thresholds', async () => {
    const { teacher, studentA } = await seedClassroom();
    const teacherSession = await loginAgent(teacher.email);

    const teacherRead = await teacherSession.agent.get('/api/settings');
    assert.equal(teacherRead.status, 200);
    assert.equal(teacherRead.body.data.gradingPolicy.passMark, 40);

    const teacherWrite = await csrfRequest(
      teacherSession.agent.put('/api/settings'),
      teacherSession.csrf
    ).send({ passMark: 50, grades: [{ label: 'A', min: 80 }, { label: 'F', min: 0 }] });
    assert.equal(teacherWrite.status, 403);

    const created = await createReportViaApi(teacherSession, studentA);
    assert.equal(created.status, 201);
    const oldReportId = created.body.data.report.id;

    const adminSession = await createAdminSession();
    const invalid = await csrfRequest(adminSession.agent.put('/api/settings'), adminSession.csrf).send({
      passMark: 40,
      grades: [{ label: 'A', min: 80 }, { label: 'B', min: 80 }, { label: 'F', min: 0 }]
    });
    assert.equal(invalid.status, 422);
    assert.equal(invalid.body.error.code, 'INVALID_GRADING_POLICY');

    const updated = await csrfRequest(adminSession.agent.put('/api/settings'), adminSession.csrf).send({
      passMark: 85,
      grades: [
        { label: 'A+', min: 95 },
        { label: 'A', min: 85 },
        { label: 'B', min: 75 },
        { label: 'C', min: 65 },
        { label: 'D', min: 55 },
        { label: 'F', min: 0 }
      ]
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.gradingPolicy.passMark, 85);

    // Historical grades are preserved when the policy changes.
    const oldReport = await adminSession.agent.get(`/api/reports/${oldReportId}`);
    assert.equal(oldReport.status, 200);
    assert.equal(oldReport.body.data.report.grade, 'A');
    assert.equal(oldReport.body.data.report.result, 'Pass');

    // New reports use the current policy.
    const newReport = await createReportViaApi(teacherSession, studentA);
    assert.equal(newReport.status, 201);
    assert.equal(newReport.body.data.report.grade, 'B');
    assert.equal(newReport.body.data.report.result, 'Fail');
  });
});

describe('dashboards', () => {
  it('returns admin, teacher and student overview data with the existing calculations', async () => {
    const { teacher, studentA } = await seedClassroom();
    const teacherSession = await loginAgent(teacher.email);
    const created = await createReportViaApi(teacherSession, studentA);
    assert.equal(created.status, 201);

    const adminSession = await createAdminSession();
    const adminOverview = await adminSession.agent.get('/api/admin/overview');
    assert.equal(adminOverview.status, 200);
    assert.equal(adminOverview.body.data.overview.totalUsers, 6);
    assert.equal(adminOverview.body.data.overview.students, 3);
    assert.equal(adminOverview.body.data.overview.teachers, 2);
    assert.equal(adminOverview.body.data.overview.reports, 1);
    assert.equal(adminOverview.body.data.overview.assignments, 1);
    assert.equal(adminOverview.body.data.overview.classAverage, 80);
    assert.equal(adminOverview.body.data.overview.recentReports.length, 1);

    const teacherOverview = await teacherSession.agent.get('/api/teacher/overview');
    assert.equal(teacherOverview.status, 200);
    assert.equal(teacherOverview.body.data.overview.classes.length, 1);
    assert.equal(teacherOverview.body.data.overview.studentCount, 1);
    assert.equal(teacherOverview.body.data.overview.reportCount, 1);
    assert.equal(teacherOverview.body.data.overview.averageMarks, 80);

    const roster = await teacherSession.agent.get('/api/teacher/roster');
    assert.equal(roster.status, 200);
    assert.equal(roster.body.data.students[0].latestGrade, 'A');
    assert.equal(roster.body.data.students[0].latestAttendance, 90);

    const studentSession = await loginAgent(studentA.email);
    const studentOverview = await studentSession.agent.get('/api/student/overview');
    assert.equal(studentOverview.status, 200);
    assert.equal(studentOverview.body.data.overview.stats.subjects, 1);
    assert.equal(studentOverview.body.data.overview.stats.averageMarks, 80);
    assert.equal(studentOverview.body.data.overview.stats.averageAttendance, 90);
    assert.equal(studentOverview.body.data.overview.stats.passRate, 100);
    assert.equal(studentOverview.body.data.overview.stats.overallGrade, 'A');
    assert.equal(studentOverview.body.data.overview.stats.gpa, '8.00');
    assert.equal(studentOverview.body.data.overview.reports.length, 1);
  });
});

describe('routing and validation edge cases', () => {
  it('returns 404 for unknown API routes and 400 for malformed identifiers', async () => {
    const unknown = await request(app).get('/api/does-not-exist');
    assert.equal(unknown.status, 404);

    const session = await createAdminSession();
    const badId = await session.agent.get('/api/users/not-an-object-id');
    assert.equal(badId.status, 400);
    assert.equal(badId.body.error.code, 'INVALID_IDENTIFIER');
  });

  it('rejects invalid query and body data', async () => {
    const { studentA } = await seedClassroom();
    const session = await createAdminSession();

    const invalidRoleFilter = await session.agent.get('/api/users?role=admin');
    assert.equal(invalidRoleFilter.status, 422);

    const invalidEmail = await csrfRequest(session.agent.post('/api/users'), session.csrf).send({
      name: 'Invalid Email',
      email: 'not-an-email',
      password: DEFAULT_PASSWORD,
      role: 'student'
    });
    assert.equal(invalidEmail.status, 422);

    const invalidUpdate = await csrfRequest(
      session.agent.patch(`/api/users/${studentA._id.toString()}`),
      session.csrf
    ).send({ role: 'admin' });
    assert.equal(invalidUpdate.status, 422);
  });
});
