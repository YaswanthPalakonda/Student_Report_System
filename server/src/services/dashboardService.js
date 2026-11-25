import { Report } from '../models/Report.js';
import { TeacherAssignment } from '../models/TeacherAssignment.js';
import { User } from '../models/User.js';
import { forbidden } from '../utils/ApiError.js';
import {
  toPublicAssignment,
  toPublicGradingPolicy,
  toPublicReport,
  toPublicUser
} from '../utils/serializers.js';
import {
  getTeacherAssignments,
  normalizeKey,
  uniqueClassNames
} from './assignmentService.js';
import { calculateStudentStats } from './gradeService.js';
import { getGradingPolicyDocument } from './gradingService.js';

async function getActiveStudentsInClasses(classes) {
  const classKeys = new Set(classes.map(normalizeKey));
  const students = await User.find({ role: 'student', isActive: { $ne: false } }).sort({ name: 1 });

  return students.filter(student => classKeys.has(normalizeKey(student.className)));
}

async function getTeacherContext(teacher) {
  const assignments = await getTeacherAssignments(teacher._id);
  const classes = uniqueClassNames(assignments);
  const students = await getActiveStudentsInClasses(classes);

  return { assignments, classes, students };
}

export async function getAdminOverview() {
  const [totalUsers, students, teachers, reportCount, assignmentCount, averageResult, recentReports] =
    await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'teacher' }),
      Report.countDocuments({}),
      TeacherAssignment.countDocuments({}),
      Report.aggregate([{ $group: { _id: null, average: { $avg: '$marks' } } }]),
      Report.find({}).sort({ createdAt: -1 }).limit(5)
    ]);

  return {
    totalUsers,
    students,
    teachers,
    reports: reportCount,
    assignments: assignmentCount,
    classAverage: averageResult[0]?.average || 0,
    recentReports: recentReports.map(toPublicReport)
  };
}

export async function getTeacherOverview(teacher) {
  const { assignments, classes, students } = await getTeacherContext(teacher);
  const reports = await Report.find({ teacher: teacher._id });

  const averageMarks = reports.length
    ? reports.reduce((sum, report) => sum + Number(report.marks || 0), 0) / reports.length
    : 0;

  return {
    assignments: assignments.map(toPublicAssignment),
    classes,
    studentCount: students.length,
    reportCount: reports.length,
    averageMarks
  };
}

export async function getTeacherStudents(teacher, query = {}) {
  const { classes, assignments } = await getTeacherContext(teacher);
  const requestedClass = query.className;

  if (requestedClass) {
    const requestedKey = normalizeKey(requestedClass);
    const allowed = classes.some(className => normalizeKey(className) === requestedKey);

    if (!allowed) {
      throw forbidden('You are not assigned to this class.');
    }
  }

  const students = await getActiveStudentsInClasses(classes);
  const filtered = requestedClass
    ? students.filter(student => normalizeKey(student.className) === normalizeKey(requestedClass))
    : students;

  return {
    classes,
    assignments: assignments.map(toPublicAssignment),
    students: filtered.map(toPublicUser)
  };
}

export async function getTeacherRoster(teacher, query = {}) {
  const { classes, assignments, students } = await getTeacherContext(teacher);
  const requestedClass = query.className;

  if (requestedClass) {
    const requestedKey = normalizeKey(requestedClass);
    const allowed = classes.some(className => normalizeKey(className) === requestedKey);

    if (!allowed) {
      throw forbidden('You are not assigned to this class.');
    }
  }

  const rosterStudents = requestedClass
    ? students.filter(student => normalizeKey(student.className) === normalizeKey(requestedClass))
    : students;

  const studentIds = rosterStudents.map(student => student._id);
  const reports = studentIds.length
    ? await Report.find({ teacher: teacher._id, student: { $in: studentIds } }).sort({ createdAt: 1 })
    : [];

  const latestByStudent = new Map();

  for (const report of reports) {
    latestByStudent.set(report.student.toString(), report);
  }

  return {
    classes,
    assignments: assignments.map(toPublicAssignment),
    students: rosterStudents.map(student => {
      const latestReport = latestByStudent.get(student._id.toString()) || null;
      const latest = latestReport ? toPublicReport(latestReport) : null;

      return {
        ...toPublicUser(student),
        latestReport: latest,
        latestGrade: latest?.grade || '—',
        latestAttendance: latest?.attendance ?? null,
        latestAttendanceStatus: latest?.attendanceStatus || ''
      };
    })
  };
}

export async function getStudentOverview(student) {
  const [policyDocument, reports] = await Promise.all([
    getGradingPolicyDocument(),
    Report.find({ student: student._id }).sort({ createdAt: -1 })
  ]);

  const stats = calculateStudentStats(reports, policyDocument.grades, policyDocument.passMark);

  return {
    profile: toPublicUser(student),
    stats,
    reports: reports.map(toPublicReport),
    gradingPolicy: toPublicGradingPolicy(policyDocument)
  };
}
