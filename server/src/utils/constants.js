export const ROLES = Object.freeze({
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student'
});

export const MANAGEABLE_ROLES = Object.freeze([ROLES.STUDENT, ROLES.TEACHER]);

export const ATTENDANCE_STATUSES = Object.freeze(['Present', 'Late', 'Absent']);

export const RESULTS = Object.freeze(['Pass', 'Fail']);

export const SESSION_COOKIE = 'srs_session';
export const CSRF_COOKIE = 'srs_csrf';
export const CSRF_HEADER = 'x-csrf-token';

export const JWT_ISSUER = 'student-report-system';
export const JWT_AUDIENCE = 'student-report-system-web';

export const DEFAULT_GRADING_POLICY = Object.freeze({
  passMark: 40,
  grades: Object.freeze([
    Object.freeze({ label: 'A+', min: 90 }),
    Object.freeze({ label: 'A', min: 80 }),
    Object.freeze({ label: 'B', min: 70 }),
    Object.freeze({ label: 'C', min: 60 }),
    Object.freeze({ label: 'D', min: 50 }),
    Object.freeze({ label: 'F', min: 0 })
  ])
});

export const MAX_PAGE_SIZE = 500;
