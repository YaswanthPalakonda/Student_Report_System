import { DEFAULT_GRADING_POLICY } from '../utils/constants.js';

export function normalizeGrades(grades) {
  return (grades || [])
    .map(grade => ({
      label: String(grade.label).trim(),
      min: Number(grade.min)
    }))
    .sort((a, b) => b.min - a.min);
}

export function validateGradeThresholds(grades) {
  const normalized = normalizeGrades(grades);

  if (normalized.length === 0) {
    return { valid: false, message: 'At least one grade threshold is required.', grades: normalized };
  }

  const labels = new Set();

  for (let index = 0; index < normalized.length; index += 1) {
    const grade = normalized[index];

    if (!grade.label) {
      return { valid: false, message: 'Every grade threshold needs a label.', grades: normalized };
    }

    if (!Number.isFinite(grade.min) || grade.min < 0 || grade.min > 100) {
      return { valid: false, message: 'Grade thresholds must be between 0 and 100.', grades: normalized };
    }

    if (labels.has(grade.label)) {
      return { valid: false, message: 'Grade labels must be unique.', grades: normalized };
    }

    labels.add(grade.label);

    if (index > 0 && grade.min >= normalized[index - 1].min) {
      return {
        valid: false,
        message: 'Each grade threshold must be lower than the one above it.',
        grades: normalized
      };
    }
  }

  return { valid: true, message: '', grades: normalized };
}

export function calculateGrade(marks, grades) {
  const numericMarks = Number(marks);

  if (!Number.isFinite(numericMarks)) {
    return 'F';
  }

  return normalizeGrades(grades).find(grade => numericMarks >= grade.min)?.label || 'F';
}

export function calculateResult(marks, passMark) {
  return Number(marks) >= Number(passMark) ? 'Pass' : 'Fail';
}

export function computeReportMetrics({
  testMarks,
  examMarks,
  attendance,
  grades = DEFAULT_GRADING_POLICY.grades,
  passMark = DEFAULT_GRADING_POLICY.passMark
}) {
  const test = Number(testMarks);
  const exam = Number(examMarks);
  const attendanceValue = Number(attendance);
  const marks = test + exam;

  return {
    testMarks: test,
    examMarks: exam,
    marks,
    percentage: marks,
    grade: calculateGrade(marks, grades),
    result: calculateResult(marks, passMark),
    attendance: attendanceValue,
    attendanceStatus: undefined
  };
}

export function calculateStudentStats(reports, grades, passMark) {
  const total = reports.length;

  if (total === 0) {
    return {
      subjects: 0,
      averageMarks: 0,
      averageAttendance: 0,
      passRate: 0,
      overallGrade: '—',
      gpa: '—'
    };
  }

  const averageMarks = reports.reduce((sum, report) => sum + Number(report.marks || 0), 0) / total;
  const averageAttendance =
    reports.reduce((sum, report) => sum + Number(report.attendance || 0), 0) / total;
  const passedReports = reports.filter(report => report.result === 'Pass').length;

  return {
    subjects: total,
    averageMarks,
    averageAttendance,
    passRate: (passedReports / total) * 100,
    overallGrade: calculateGrade(averageMarks, grades),
    gpa: (averageMarks / 10).toFixed(2)
  };
}
