import { z } from 'zod';
export const id = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid record ID.');
const name = z.string().trim().min(1).max(100);
const email = z.string().trim().toLowerCase().email().max(254);
export const password = z.string().min(8).refine(s => Buffer.byteLength(s, 'utf8') <= 72, 'Password must be at most 72 UTF-8 bytes.');
export const login = z.object({ email, password: z.string().min(1).max(256) }).strict();
const userFields = { name, email, role: z.enum(['student', 'teacher']), classId: id.nullable().optional(), studentId: z.string().trim().max(80).default('') };
export const createUser = z.object({ ...userFields, password }).strict();
export const editUser = z.object({ ...userFields, password: password.optional(), active: z.boolean().optional(), revision: z.number().int().nonnegative() }).strict();
export const catalog = z.object({ name }).strict();
export const assignment = z.object({ teacherId: id, classId: id, subjectId: id }).strict();
const number = max => z.number().finite().min(0).max(max);
export const report = z.object({
  studentId: id, subjectId: id, testMarks: number(40), examMarks: number(60),
  attendance: number(100), attendanceStatus: z.enum(['Present', 'Absent', 'Late']),
  remarks: z.string().trim().max(2000).default(''),
}).strict();
export const editReport = report.extend({ revision: z.number().int().nonnegative() }).strict();
export const grading = z.object({
  passMark: number(100), grades: z.array(z.object({ label: name, min: number(100) }).strict()).min(2).max(20),
  revision: z.number().int().min(-1),
}).strict().refine(s => new Set(s.grades.map(g => g.min)).size === s.grades.length && new Set(s.grades.map(g => g.label)).size === s.grades.length && s.grades.some(g => g.min === 0), 'Grades need unique labels, unique thresholds and a zero threshold.');
export const validate = schema => (req, _res, next) => { req.input = schema.parse(req.body); next(); };
export const validateId = (req, _res, next) => { id.parse(req.params.id); next(); };
