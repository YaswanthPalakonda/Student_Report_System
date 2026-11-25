import mongoose from 'mongoose';

import { TeacherAssignment } from '../models/TeacherAssignment.js';
import { User } from '../models/User.js';
import { ApiError, conflict, forbidden, notFound } from '../utils/ApiError.js';
import { toPublicAssignment } from '../utils/serializers.js';

const TEACHER_ROLE = 'teacher';

export function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

export async function getTeacherAssignments(teacherId) {
  return TeacherAssignment.find({ teacher: teacherId }).sort({ className: 1, subject: 1 });
}

export function uniqueClassNames(assignments) {
  const seen = new Set();
  const classes = [];

  for (const assignment of assignments) {
    const key = normalizeKey(assignment.className);

    if (key && !seen.has(key)) {
      seen.add(key);
      classes.push(assignment.className);
    }
  }

  return classes;
}

export async function listAssignments(actor) {
  const query = actor.role === 'teacher' ? { teacher: actor._id } : {};
  const assignments = await TeacherAssignment.find(query).sort({ className: 1, subject: 1 });
  return assignments.map(toPublicAssignment);
}

export async function createAssignment(input) {
  if (!mongoose.isValidObjectId(input.teacherId)) {
    throw new ApiError(400, 'INVALID_IDENTIFIER', 'A valid teacher identifier is required.');
  }

  const teacher = await User.findById(input.teacherId);

  if (!teacher || teacher.isActive === false) {
    throw notFound('Teacher not found.');
  }

  if (teacher.role !== TEACHER_ROLE) {
    throw new ApiError(422, 'INVALID_TEACHER', 'Assignments can only be created for teacher accounts.');
  }

  const existingAssignments = await TeacherAssignment.find({ teacher: teacher._id });
  const duplicate = existingAssignments.some(
    assignment =>
      normalizeKey(assignment.className) === normalizeKey(input.className) &&
      normalizeKey(assignment.subject) === normalizeKey(input.subject)
  );

  if (duplicate) {
    throw conflict('This teacher assignment already exists.', {
      fields: [{ field: 'subject', message: 'This class and subject are already assigned to the teacher.' }]
    });
  }

  const assignment = await TeacherAssignment.create({
    teacher: teacher._id,
    teacherEmail: teacher.email,
    teacherName: teacher.name,
    className: input.className,
    subject: input.subject
  });

  return toPublicAssignment(assignment);
}

export async function deleteAssignment(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'INVALID_IDENTIFIER', 'A valid assignment identifier is required.');
  }

  const assignment = await TeacherAssignment.findByIdAndDelete(id);

  if (!assignment) {
    throw notFound('Assignment not found.');
  }

  return { id: assignment._id.toString() };
}

export async function isTeacherAuthorizedForClassSubject(teacherId, className, subject) {
  const assignments = await TeacherAssignment.find({ teacher: teacherId });
  const targetClass = normalizeKey(className);
  const targetSubject = normalizeKey(subject);

  return assignments.some(
    assignment =>
      normalizeKey(assignment.className) === targetClass &&
      normalizeKey(assignment.subject) === targetSubject
  );
}

export async function assertTeacherAuthorizedForClassSubject(teacherId, className, subject) {
  const authorized = await isTeacherAuthorizedForClassSubject(teacherId, className, subject);

  if (!authorized) {
    throw forbidden('You are not assigned to this class and subject.');
  }
}
