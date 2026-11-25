import mongoose from 'mongoose';

import { Report } from '../models/Report.js';
import { User } from '../models/User.js';
import { ApiError, forbidden, notFound } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { toPublicReport } from '../utils/serializers.js';
import { assertTeacherAuthorizedForClassSubject } from './assignmentService.js';
import { computeReportMetrics } from './gradeService.js';
import { getGradingPolicyDocument } from './gradingService.js';

const STUDENT_ROLE = 'student';

function ensureObjectId(id, label) {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'INVALID_IDENTIFIER', `A valid ${label} identifier is required.`);
  }
}

function roleScope(user) {
  if (user.role === 'student') {
    return { student: user._id };
  }

  if (user.role === 'teacher') {
    return { teacher: user._id };
  }

  return {};
}

export async function listReports(user, query = {}) {
  const filter = roleScope(user);

  if (query.result) {
    filter.result = query.result;
  }

  if (query.className) {
    filter.className = query.className;
  }

  if (query.subject) {
    filter.subject = query.subject;
  }

  if (query.search) {
    const search = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [
      { studentName: search },
      { studentEmail: search },
      { subject: search },
      { studentId: search }
    ];
  }

  const limit = query.limit || 500;

  const [reports, count] = await Promise.all([
    Report.find(filter).sort({ createdAt: -1 }).limit(limit),
    Report.countDocuments(filter)
  ]);

  return {
    reports: reports.map(toPublicReport),
    count
  };
}

export async function getReportById(user, id) {
  ensureObjectId(id, 'report');

  const report = await Report.findById(id);

  if (!report) {
    throw notFound('Report not found.');
  }

  const ownsReport =
    user.role === 'admin' ||
    (user.role === 'teacher' && report.teacher.toString() === user._id.toString()) ||
    (user.role === 'student' && report.student.toString() === user._id.toString());

  if (!ownsReport) {
    throw notFound('Report not found.');
  }

  return toPublicReport(report);
}

async function loadStudent(studentUserId) {
  ensureObjectId(studentUserId, 'student');

  const student = await User.findById(studentUserId);

  if (!student || student.isActive === false || student.role !== STUDENT_ROLE) {
    throw notFound('Student not found.');
  }

  if (!String(student.className || '').trim()) {
    throw forbidden('The student is not assigned to a class.');
  }

  return student;
}

function buildReportSnapshot(student, teacher, subject, metrics, remarks) {
  return {
    student: student._id,
    studentEmail: student.email,
    studentName: student.name,
    studentId: student.studentId || '',
    className: student.className || '',
    subject,
    testMarks: metrics.testMarks,
    examMarks: metrics.examMarks,
    marks: metrics.marks,
    percentage: metrics.percentage,
    grade: metrics.grade,
    result: metrics.result,
    attendance: metrics.attendance,
    attendanceStatus: metrics.attendanceStatus,
    remarks,
    teacher: teacher._id,
    teacherEmail: teacher.email,
    teacherName: teacher.name,
    date: new Date().toISOString().slice(0, 10)
  };
}

export async function createReport(teacher, input) {
  const student = await loadStudent(input.studentUserId);
  const subject = String(input.subject).trim();

  await assertTeacherAuthorizedForClassSubject(teacher._id, student.className, subject);

  const policy = await getGradingPolicyDocument();
  const metrics = computeReportMetrics({
    testMarks: input.testMarks,
    examMarks: input.examMarks,
    attendance: input.attendance,
    grades: policy.grades,
    passMark: policy.passMark
  });

  metrics.attendanceStatus = input.attendanceStatus;

  const snapshot = buildReportSnapshot(
    student,
    teacher,
    subject,
    metrics,
    input.remarks || ''
  );

  const report = await Report.create(snapshot);
  return toPublicReport(report);
}

export async function updateReport(teacher, id, input) {
  ensureObjectId(id, 'report');

  const report = await Report.findById(id);

  if (!report) {
    throw notFound('Report not found.');
  }

  if (report.teacher.toString() !== teacher._id.toString()) {
    throw notFound('Report not found.');
  }

  const targetStudentId = input.studentUserId || report.student.toString();
  const student = await loadStudent(targetStudentId);
  const targetSubject = input.subject !== undefined ? String(input.subject).trim() : report.subject;

  await assertTeacherAuthorizedForClassSubject(teacher._id, student.className, targetSubject);

  const policy = await getGradingPolicyDocument();
  const metrics = computeReportMetrics({
    testMarks: input.testMarks ?? report.testMarks,
    examMarks: input.examMarks ?? report.examMarks,
    attendance: input.attendance ?? report.attendance,
    grades: policy.grades,
    passMark: policy.passMark
  });

  metrics.attendanceStatus = input.attendanceStatus ?? report.attendanceStatus;

  report.student = student._id;
  report.studentEmail = student.email;
  report.studentName = student.name;
  report.studentId = student.studentId || '';
  report.className = student.className || '';
  report.subject = targetSubject;
  report.testMarks = metrics.testMarks;
  report.examMarks = metrics.examMarks;
  report.marks = metrics.marks;
  report.percentage = metrics.percentage;
  report.grade = metrics.grade;
  report.result = metrics.result;
  report.attendance = metrics.attendance;
  report.attendanceStatus = metrics.attendanceStatus;
  report.remarks = input.remarks !== undefined ? input.remarks : report.remarks;
  report.teacherEmail = teacher.email;
  report.teacherName = teacher.name;

  await report.save();

  return toPublicReport(report);
}
