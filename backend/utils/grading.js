export const defaultSettings = {
  passMark: 40,
  grades: [{ label: 'A+', min: 90 }, { label: 'A', min: 80 }, { label: 'B', min: 70 }, { label: 'C', min: 60 }, { label: 'D', min: 50 }, { label: 'F', min: 0 }],
};
export function gradeFor(marks, settings = defaultSettings) {
  return [...settings.grades].sort((a, b) => b.min - a.min).find(g => marks >= g.min)?.label || 'F';
}
export function calculateReport(testMarks, examMarks, settings = defaultSettings) {
  const marks = testMarks + examMarks;
  return { marks, percentage: marks, grade: gradeFor(marks, settings), result: marks >= settings.passMark ? 'Pass' : 'Fail' };
}
export function summarize(reports, settings = defaultSettings) {
  const averageMarks = reports.length ? reports.reduce((sum, r) => sum + r.marks, 0) / reports.length : 0;
  return { subjects: reports.length, averageMarks,
    averageAttendance: reports.length ? reports.reduce((sum, r) => sum + r.attendance, 0) / reports.length : 0,
    passRate: reports.length ? reports.filter(r => r.result === 'Pass').length / reports.length * 100 : 0,
    overallGrade: reports.length ? gradeFor(averageMarks, settings) : '—',
    gpa: reports.length ? (averageMarks / 10).toFixed(2) : '—' };
}
