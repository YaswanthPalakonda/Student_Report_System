function objectIdString(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value.toString === 'function') {
    return value.toString();
  }

  return String(value);
}

export function toPublicUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: objectIdString(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    className: user.className || '',
    studentId: user.studentId || '',
    isActive: user.isActive !== false,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export function toPublicAssignment(assignment) {
  if (!assignment) {
    return null;
  }

  return {
    id: objectIdString(assignment._id),
    teacherId: objectIdString(assignment.teacher),
    teacherEmail: assignment.teacherEmail,
    teacherName: assignment.teacherName,
    className: assignment.className,
    subject: assignment.subject,
    createdAt: assignment.createdAt,
    updatedAt: assignment.updatedAt
  };
}

export function toPublicReport(report) {
  if (!report) {
    return null;
  }

  return {
    id: objectIdString(report._id),
    studentUserId: objectIdString(report.student),
    studentEmail: report.studentEmail,
    studentName: report.studentName,
    studentId: report.studentId || '',
    className: report.className || '',
    subject: report.subject,
    testMarks: report.testMarks,
    examMarks: report.examMarks,
    marks: report.marks,
    percentage: report.percentage ?? report.marks,
    grade: report.grade,
    result: report.result,
    attendance: report.attendance,
    attendanceStatus: report.attendanceStatus,
    remarks: report.remarks || '',
    teacherUserId: objectIdString(report.teacher),
    teacherEmail: report.teacherEmail,
    teacherName: report.teacherName,
    date: report.date,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt
  };
}

export function toPublicGradingPolicy(policy) {
  return {
    passMark: policy.passMark,
    grades: policy.grades.map(grade => ({ label: grade.label, min: grade.min })),
    updatedAt: policy.updatedAt
  };
}
