import User from '../models/User.js';
import TeacherAssignment from '../models/TeacherAssignment.js';
import AcademicReport from '../models/AcademicReport.js';
import { HttpError, requireFound, ok } from '../utils/errors.js';
import { reportDTO, reportPopulation, userDTO } from '../utils/serializers.js';
import { calculateReport, summarize } from '../utils/grading.js';
import { settingsValue } from './admin.js';

async function scope(user) {
  if (user.role === 'admin') return {};
  if (user.role === 'student') return { student: user._id };
  const assignments = await TeacherAssignment.find({ teacher: user._id });
  return assignments.length ? { $or: assignments.map(a => ({ class: a.class, subject: a.subject })) } : { _id: null };
}
export async function roster(req, res) {
  const classes = await TeacherAssignment.distinct('class', { teacher: req.user._id });
  ok(res, (await User.find({ role: 'student', active: true, class: { $in: classes } }).populate('class').sort({ name: 1 })).map(userDTO));
}
export async function list(req, res) {
  const reports = await AcademicReport.find(await scope(req.user)).populate(reportPopulation).sort({ createdAt: 1 });
  const search = String(req.query.search || '').slice(0, 100).toLowerCase();
  ok(res, reports.map(reportDTO).filter(r => (!req.query.result || r.result === req.query.result) && `${r.studentName} ${r.subject}`.toLowerCase().includes(search)));
}
export async function get(req, res) {
  const report = requireFound(await AcademicReport.findOne({ $and: [{ _id: req.params.id }, await scope(req.user)] }).populate(reportPopulation));
  ok(res, reportDTO(report));
}
export async function save(req, res) {
  const input = req.input;
  const student = requireFound(await User.findOne({ _id: input.studentId, role: 'student', active: true }), 'Active student not found.');
  if (!student.class || !await TeacherAssignment.exists({ teacher: req.user._id, class: student.class, subject: input.subjectId })) throw new HttpError(403, 'You are not assigned to this student’s class and subject.');
  let report;
  if (req.params.id) {
    report = requireFound(await AcademicReport.findOne({ $and: [{ _id: req.params.id }, await scope(req.user)] }));
    if (String(report.student) !== input.studentId || String(report.subject) !== input.subjectId || String(report.class) !== String(student.class)) throw new HttpError(409, 'A report’s student, class and subject cannot be changed.');
    if (report.__v !== input.revision) throw new HttpError(409, 'This report changed. Reload it before saving.');
  } else {
    report = new AcademicReport({ student: student._id, class: student.class, subject: input.subjectId });
  }
  const settings = await settingsValue();
  Object.assign(report, { teacher: req.user._id, testMarks: input.testMarks, examMarks: input.examMarks,
    attendance: input.attendance, attendanceStatus: input.attendanceStatus, remarks: input.remarks,
    ...calculateReport(input.testMarks, input.examMarks, settings),
    gradingSnapshot: { passMark: settings.passMark, grades: settings.grades, version: settings.revision },
  });
  await report.save();
  ok(res, reportDTO(await report.populate(reportPopulation)), req.params.id ? 200 : 201);
}
export async function remove(req, res) {
  requireFound(await AcademicReport.findByIdAndDelete(req.params.id)); ok(res, { deleted: true });
}
export async function summary(req, res) {
  const reports = await AcademicReport.find({ student: req.user._id });
  ok(res, summarize(reports, await settingsValue()));
}
