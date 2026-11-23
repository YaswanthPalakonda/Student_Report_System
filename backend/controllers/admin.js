import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Class from '../models/Class.js';
import Subject from '../models/Subject.js';
import TeacherAssignment from '../models/TeacherAssignment.js';
import AcademicReport from '../models/AcademicReport.js';
import GradingSettings from '../models/GradingSettings.js';
import AuthSession from '../models/AuthSession.js';
import { HttpError, requireFound, ok } from '../utils/errors.js';
import { userDTO, catalogDTO, assignmentDTO } from '../utils/serializers.js';
import { defaultSettings } from '../utils/grading.js';

export async function settingsValue() {
  const value = await GradingSettings.findOne({ key: 'default' });
  return value ? { passMark: value.passMark, grades: value.grades.map(g => ({ label: g.label, min: g.min })), revision: value.__v } : { ...defaultSettings, revision: -1 };
}
export async function dashboard(_req, res) {
  const [totalUsers, students, teachers, reportCount, assignments, average] = await Promise.all([
    User.countDocuments({ active: true }), User.countDocuments({ active: true, role: 'student' }), User.countDocuments({ active: true, role: 'teacher' }),
    AcademicReport.countDocuments(), TeacherAssignment.countDocuments(), AcademicReport.aggregate([{ $group: { _id: null, average: { $avg: '$marks' } } }]),
  ]);
  ok(res, { totalUsers, students, teachers, reports: reportCount, assignments, average: average[0]?.average || 0 });
}
export async function listUsers(req, res) {
  const users = await User.find({}).populate('class').sort({ createdAt: 1 });
  const search = String(req.query.search || '').slice(0, 100).toLowerCase();
  ok(res, users.filter(u => (!req.query.role || req.query.role === u.role) && `${u.name} ${u.email}`.toLowerCase().includes(search)).map(userDTO));
}
export async function getUser(req, res) { ok(res, userDTO(requireFound(await User.findById(req.params.id).populate('class')))); }
async function checkClass(input) {
  if (input.classId) requireFound(await Class.findById(input.classId), 'Class not found.');
  if (input.role === 'teacher' && (input.classId || input.studentId)) throw new HttpError(400, 'Use assignments for teacher classes; student identifiers belong to students.');
}
export async function createUser(req, res) {
  const input = req.input;
  await checkClass(input);
  const user = await User.create({ name: input.name, email: input.email, role: input.role,
    class: input.classId || null, studentId: input.studentId, passwordHash: await bcrypt.hash(input.password, 12) });
  ok(res, userDTO(await user.populate('class')), 201);
}
export async function editUser(req, res) {
  const input = req.input;
  const user = requireFound(await User.findById(req.params.id));
  if (user.role === 'admin') throw new HttpError(403, 'Administrator accounts are managed through controlled setup.');
  if (input.revision !== user.__v) throw new HttpError(409, 'This account changed. Refresh before saving.');
  if (user.role !== input.role && (await TeacherAssignment.exists({ teacher: user._id }) || await AcademicReport.exists({ $or: [{ student: user._id }, { teacher: user._id }] }))) throw new HttpError(409, 'Accounts with academic records or assignments cannot change role.');
  await checkClass(input);
  Object.assign(user, { name: input.name, email: input.email, role: input.role, class: input.classId || null, studentId: input.studentId });
  if (input.active !== undefined) user.active = input.active;
  if (input.password) user.passwordHash = await bcrypt.hash(input.password, 12);
  user.authVersion += 1;
  await user.save();
  await AuthSession.deleteMany({ user: user._id });
  ok(res, userDTO(await user.populate('class')));
}
export async function deactivateUser(req, res) {
  const user = requireFound(await User.findById(req.params.id));
  if (user.role === 'admin') throw new HttpError(403, 'Administrator accounts cannot be deactivated here.');
  user.active = false; user.authVersion += 1; await user.save();
  await AuthSession.deleteMany({ user: user._id }); ok(res, { deactivated: true });
}
export function catalogController(Model, field) {
  return {
    list: async (req, res) => {
      let filter = {};
      if (req.user.role === 'teacher') filter = { _id: { $in: await TeacherAssignment.distinct(field, { teacher: req.user._id }) } };
      else if (req.user.role === 'student') filter = { _id: { $in: field === 'class' ? [req.user.class?._id].filter(Boolean) : await AcademicReport.distinct('subject', { student: req.user._id }) } };
      ok(res, (await Model.find(filter).sort({ name: 1 })).map(catalogDTO));
    },
    create: async (req, res) => ok(res, catalogDTO(await Model.create({ name: req.input.name, key: req.input.name.toLowerCase() })), 201),
    update: async (req, res) => {
      const item = requireFound(await Model.findById(req.params.id));
      item.name = req.input.name; item.key = req.input.name.toLowerCase(); await item.save(); ok(res, catalogDTO(item));
    },
    remove: async (req, res) => {
      const item = requireFound(await Model.findById(req.params.id));
      if (await TeacherAssignment.exists({ [field]: item._id }) || await AcademicReport.exists({ [field]: item._id }) || (field === 'class' && await User.exists({ class: item._id }))) throw new HttpError(409, 'This record is in use and cannot be deleted.');
      await item.deleteOne(); ok(res, { deleted: true });
    },
  };
}
export async function listAssignments(req, res) {
  const values = await TeacherAssignment.find(req.user.role === 'admin' ? {} : { teacher: req.user._id }).populate('teacher class subject').sort({ createdAt: 1 });
  ok(res, values.filter(v => v.teacher?.active).map(assignmentDTO));
}
export async function saveAssignment(req, res) {
  const { teacherId, classId, subjectId } = req.input;
  requireFound(await User.findOne({ _id: teacherId, role: 'teacher', active: true }), 'Active teacher not found.');
  requireFound(await Class.findById(classId), 'Class not found.');
  requireFound(await Subject.findById(subjectId), 'Subject not found.');
  const value = req.params.id ? requireFound(await TeacherAssignment.findById(req.params.id)) : new TeacherAssignment();
  Object.assign(value, { teacher: teacherId, class: classId, subject: subjectId }); await value.save();
  ok(res, assignmentDTO(await value.populate('teacher class subject')), req.params.id ? 200 : 201);
}
export async function deleteAssignment(req, res) {
  requireFound(await TeacherAssignment.findByIdAndDelete(req.params.id)); ok(res, { deleted: true });
}
export async function getSettings(_req, res) { ok(res, await settingsValue()); }
export async function saveSettings(req, res) {
  let settings = await GradingSettings.findOne({ key: 'default' });
  if (req.input.revision !== (settings?.__v ?? -1)) throw new HttpError(409, 'Grading settings changed. Refresh before saving.');
  settings ||= new GradingSettings({ key: 'default' });
  settings.passMark = req.input.passMark; settings.grades = [...req.input.grades].sort((a, b) => b.min - a.min);
  await settings.save(); ok(res, await settingsValue());
}
export const classes = catalogController(Class, 'class');
export const subjects = catalogController(Subject, 'subject');
