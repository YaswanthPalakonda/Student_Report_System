import mongoose from 'mongoose';

import { User } from '../models/User.js';
import { Report } from '../models/Report.js';
import { TeacherAssignment } from '../models/TeacherAssignment.js';
import { ApiError, conflict, forbidden, notFound } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { toPublicUser } from '../utils/serializers.js';
import { hashPassword } from './authService.js';

const ADMIN_ROLE = 'admin';
const TEACHER_ROLE = 'teacher';

export function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

async function findUserOrFail(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'INVALID_IDENTIFIER', 'A valid user identifier is required.');
  }

  const user = await User.findById(id).select('+tokenVersion');

  if (!user) {
    throw notFound('User not found.');
  }

  return user;
}

async function ensureEmailAvailable(email, excludedId) {
  const query = { email: normalizeEmail(email) };

  if (excludedId) {
    query._id = { $ne: excludedId };
  }

  const existing = await User.exists(query);

  if (existing) {
    throw conflict('Email already exists.', { fields: [{ field: 'email', message: 'Email already exists.' }] });
  }
}

async function syncUserSnapshots(user) {
  const assignmentUpdate = {
    teacherEmail: user.email,
    teacherName: user.name
  };

  const reportChanges = {
    teacherEmail: user.email,
    teacherName: user.name
  };

  if (user.role === 'student') {
    reportChanges.studentEmail = user.email;
    reportChanges.studentName = user.name;
  }

  await Promise.all([
    TeacherAssignment.updateMany({ teacher: user._id }, { $set: assignmentUpdate }),
    Report.updateMany(
      user.role === 'student' ? { student: user._id } : { teacher: user._id },
      { $set: reportChanges }
    )
  ]);
}

export async function listUsers(filters = {}) {
  const query = {};

  if (filters.includeAdmin !== 'true') {
    query.role = { $ne: ADMIN_ROLE };
  }

  if (filters.role) {
    query.role = filters.role;
  }

  if (filters.search) {
    const search = new RegExp(escapeRegex(filters.search), 'i');
    query.$or = [{ name: search }, { email: search }];
  }

  const users = await User.find(query).sort({ role: 1, name: 1 });
  return users.map(toPublicUser);
}

export async function getUserById(id) {
  return toPublicUser(await findUserOrFail(id));
}

export async function createUser(input) {
  const email = normalizeEmail(input.email);
  await ensureEmailAvailable(email);

  const passwordHash = await hashPassword(input.password);

  const user = await User.create({
    name: input.name,
    email,
    passwordHash,
    role: input.role,
    className: input.className || '',
    studentId: input.studentId || '',
    isActive: true
  });

  return toPublicUser(user);
}

export async function updateUser(id, input) {
  const user = await findUserOrFail(id);

  if (user.role === ADMIN_ROLE) {
    throw forbidden('Administrator accounts cannot be modified through this endpoint.');
  }

  const previousRole = user.role;
  let passwordChanged = false;
  let deactivated = false;

  if (input.email !== undefined) {
    const email = normalizeEmail(input.email);
    await ensureEmailAvailable(email, user._id);
    user.email = email;
  }

  if (input.name !== undefined) user.name = input.name;
  if (input.className !== undefined) user.className = input.className;
  if (input.studentId !== undefined) user.studentId = input.studentId;
  if (input.role !== undefined) user.role = input.role;

  if (input.password !== undefined && input.password !== '') {
    user.passwordHash = await hashPassword(input.password);
    passwordChanged = true;
  }

  if (input.isActive !== undefined && user.isActive !== input.isActive) {
    user.isActive = input.isActive;

    if (input.isActive === false) {
      deactivated = true;
    }
  }

  if (passwordChanged || deactivated) {
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;
  }

  await user.save();

  if (previousRole === TEACHER_ROLE && user.role !== TEACHER_ROLE) {
    await TeacherAssignment.deleteMany({ teacher: user._id });
  }

  if (input.name !== undefined || input.email !== undefined) {
    await syncUserSnapshots(user);
  }

  return toPublicUser(user);
}

export async function deleteUser(id) {
  const user = await findUserOrFail(id);

  if (user.role === ADMIN_ROLE) {
    throw forbidden('Administrator accounts cannot be deleted through this endpoint.');
  }

  await user.deleteOne();

  if (user.role === TEACHER_ROLE) {
    await TeacherAssignment.deleteMany({ teacher: user._id });
  }

  // Historical reports are intentionally preserved with their snapshots.
  return { id: user._id.toString() };
}

export { findUserOrFail };
