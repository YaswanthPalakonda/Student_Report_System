import { z } from 'zod';

import { ATTENDANCE_STATUSES, MAX_PAGE_SIZE, RESULTS, ROLES } from '../utils/constants.js';

const objectIdPattern = /^[a-f\d]{24}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function trimmedString(min, max, label) {
  return z
    .string({ error: `${label} is required.` })
    .trim()
    .min(min, `${label} is required.`)
    .max(max, `${label} is too long.`);
}

const emailSchema = z
  .string({ error: 'Email is required.' })
  .trim()
  .toLowerCase()
  .max(254, 'Email is too long.')
  .regex(emailPattern, 'Email must be a valid email address.');

const passwordSchema = z
  .string({ error: 'Password is required.' })
  .min(6, 'Password must be at least 6 characters.')
  .max(128, 'Password must be at most 128 characters.');

const objectIdSchema = z
  .string({ error: 'A valid identifier is required.' })
  .regex(objectIdPattern, 'A valid identifier is required.');

const numberField = (min, max, label) =>
  z.preprocess(
    value => (value === '' || value === null ? undefined : value),
    z.coerce
      .number({ error: `${label} is required.` })
      .min(min, `${label} must be at least ${min}.`)
      .max(max, `${label} must be at most ${max}.`)
  );

const optionalNumberField = (min, max, label) =>
  z.preprocess(
    value => (value === '' || value === null ? undefined : value),
    z.coerce
      .number({ error: `${label} must be a number.` })
      .min(min, `${label} must be at least ${min}.`)
      .max(max, `${label} must be at most ${max}.`)
      .optional()
  );

const booleanSchema = z.union([z.boolean(), z.enum(['true', 'false']).transform(value => value === 'true')]);

const optionalBooleanSchema = booleanSchema.optional();

const gradeSchema = z.object({
  label: trimmedString(1, 20, 'Grade label'),
  min: numberField(0, 100, 'Grade threshold')
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.').max(128, 'Password is too long.'),
  rememberMe: optionalBooleanSchema.transform(value => value ?? false)
});

export const createUserSchema = z.object({
  name: trimmedString(1, 120, 'Name'),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum([ROLES.STUDENT, ROLES.TEACHER], {
    error: 'Role must be either student or teacher.'
  }),
  className: z.string().trim().max(120, 'Class name is too long.').optional().default(''),
  studentId: z.string().trim().max(60, 'Student ID is too long.').optional().default('')
});

export const updateUserSchema = z
  .object({
    name: trimmedString(1, 120, 'Name').optional(),
    email: emailSchema.optional(),
    password: z
      .union([z.literal(''), z.string().min(6, 'Password must be at least 6 characters.').max(128)])
      .optional(),
    role: z.enum([ROLES.STUDENT, ROLES.TEACHER], {
      error: 'Role must be either student or teacher.'
    }).optional(),
    className: z.string().trim().max(120, 'Class name is too long.').optional(),
    studentId: z.string().trim().max(60, 'Student ID is too long.').optional(),
    isActive: optionalBooleanSchema
  })
  .refine(value => Object.keys(value).length > 0, 'At least one field must be provided.');

export const createAssignmentSchema = z.object({
  teacherId: objectIdSchema,
  className: trimmedString(1, 120, 'Class name'),
  subject: trimmedString(1, 120, 'Subject')
});

export const createReportSchema = z.object({
  studentUserId: objectIdSchema,
  subject: trimmedString(1, 120, 'Subject'),
  testMarks: numberField(0, 40, 'Test marks'),
  examMarks: numberField(0, 60, 'Exam marks'),
  attendance: numberField(0, 100, 'Attendance'),
  attendanceStatus: z.enum(ATTENDANCE_STATUSES, {
    error: `Attendance status must be one of: ${ATTENDANCE_STATUSES.join(', ')}.`
  }),
  remarks: z.string().trim().max(2000, 'Remarks are too long.').optional().default('')
});

export const updateReportSchema = z
  .object({
    studentUserId: objectIdSchema.optional(),
    subject: trimmedString(1, 120, 'Subject').optional(),
    testMarks: optionalNumberField(0, 40, 'Test marks'),
    examMarks: optionalNumberField(0, 60, 'Exam marks'),
    attendance: optionalNumberField(0, 100, 'Attendance'),
    attendanceStatus: z.enum(ATTENDANCE_STATUSES).optional(),
    remarks: z.string().trim().max(2000, 'Remarks are too long.').optional()
  })
  .refine(value => Object.keys(value).length > 0, 'At least one field must be provided.');

export const updateGradingPolicySchema = z.object({
  passMark: numberField(0, 100, 'Pass mark'),
  grades: z.array(gradeSchema).min(1, 'At least one grade threshold is required.')
});

export const userListQuerySchema = z.object({
  role: z.enum([ROLES.STUDENT, ROLES.TEACHER]).optional(),
  search: z.string().trim().max(100).optional(),
  includeAdmin: z.enum(['true', 'false']).optional()
});

export const reportListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  result: z.enum(RESULTS).optional(),
  className: z.string().trim().max(120).optional(),
  subject: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(MAX_PAGE_SIZE)
});

export const teacherStudentsQuerySchema = z.object({
  className: z.string().trim().max(120).optional()
});

export const idParamSchema = z.object({
  id: objectIdSchema
});

export const assignmentListQuerySchema = z.object({});

export { objectIdSchema };
