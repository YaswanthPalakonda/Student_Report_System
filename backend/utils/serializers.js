export const userDTO = user => ({
  id: String(user._id), name: user.name, email: user.email, role: user.role,
  classId: user.class?._id ? String(user.class._id) : null, className: user.class?.name || '',
  studentId: user.studentId || '', active: user.active, revision: user.__v,
});
export const catalogDTO = value => ({ id: String(value._id), name: value.name });
export const assignmentDTO = value => ({ id: String(value._id), teacherId: String(value.teacher._id), teacherEmail: value.teacher.email, teacherName: value.teacher.name, classId: String(value.class._id), className: value.class.name, subjectId: String(value.subject._id), subject: value.subject.name });
export const reportDTO = value => ({
  id: String(value._id), studentRecordId: String(value.student._id), studentEmail: value.student.email,
  studentName: value.student.name, studentId: value.student.studentId || '',
  classId: String(value.class._id), className: value.class.name,
  subjectId: String(value.subject._id), subject: value.subject.name,
  teacherEmail: value.teacher.email, teacherName: value.teacher.name,
  testMarks: value.testMarks, examMarks: value.examMarks, marks: value.marks, percentage: value.percentage,
  grade: value.grade, result: value.result, attendance: value.attendance, attendanceStatus: value.attendanceStatus,
  remarks: value.remarks, date: value.updatedAt.toISOString(), revision: value.__v,
});
export const reportPopulation = [{ path: 'student', select: 'name email studentId' }, { path: 'teacher', select: 'name email' }, { path: 'class' }, { path: 'subject' }];
