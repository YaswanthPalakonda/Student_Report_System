import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DEFAULT_GRADING_POLICY } from '../src/utils/constants.js';
import {
  calculateGrade,
  calculateResult,
  calculateStudentStats,
  computeReportMetrics,
  normalizeGrades,
  validateGradeThresholds
} from '../src/services/gradeService.js';

describe('grade service', () => {
  it('calculates grades from unsorted thresholds', () => {
    const grades = [
      { label: 'F', min: 0 },
      { label: 'A+', min: 90 },
      { label: 'B', min: 70 },
      { label: 'A', min: 80 }
    ];

    assert.equal(calculateGrade(95, grades), 'A+');
    assert.equal(calculateGrade(90, grades), 'A+');
    assert.equal(calculateGrade(89.9, grades), 'A');
    assert.equal(calculateGrade(70, grades), 'B');
    assert.equal(calculateGrade(0, grades), 'F');
    assert.equal(calculateGrade(Number.NaN, grades), 'F');
  });

  it('calculates pass and fail results', () => {
    assert.equal(calculateResult(40, 40), 'Pass');
    assert.equal(calculateResult(39.99, 40), 'Fail');
  });

  it('computes report metrics and duplicate percentage', () => {
    const metrics = computeReportMetrics({
      testMarks: 32,
      examMarks: 48,
      attendance: 92,
      grades: DEFAULT_GRADING_POLICY.grades,
      passMark: 40
    });

    assert.equal(metrics.testMarks, 32);
    assert.equal(metrics.examMarks, 48);
    assert.equal(metrics.marks, 80);
    assert.equal(metrics.percentage, 80);
    assert.equal(metrics.grade, 'A');
    assert.equal(metrics.result, 'Pass');
    assert.equal(metrics.attendance, 92);
  });

  it('normalizes grades in descending order', () => {
    const normalized = normalizeGrades([
      { label: 'B', min: 70 },
      { label: 'A', min: 80 },
      { label: 'F', min: 0 }
    ]);

    assert.deepEqual(
      normalized.map(grade => grade.label),
      ['A', 'B', 'F']
    );
  });

  it('rejects duplicate labels, duplicate thresholds and out-of-range values', () => {
    assert.equal(
      validateGradeThresholds([
        { label: 'A', min: 80 },
        { label: 'A', min: 70 },
        { label: 'F', min: 0 }
      ]).valid,
      false
    );

    assert.equal(
      validateGradeThresholds([
        { label: 'A', min: 80 },
        { label: 'B', min: 80 },
        { label: 'F', min: 0 }
      ]).valid,
      false
    );

    assert.equal(
      validateGradeThresholds([{ label: 'A', min: 101 }, { label: 'F', min: 0 }]).valid,
      false
    );

    assert.equal(validateGradeThresholds([]).valid, false);
  });

  it('accepts a valid descending policy', () => {
    const result = validateGradeThresholds(DEFAULT_GRADING_POLICY.grades);
    assert.equal(result.valid, true);
    assert.equal(result.grades[0].label, 'A+');
    assert.equal(result.grades.at(-1).label, 'F');
  });

  it('calculates student dashboard statistics', () => {
    const stats = calculateStudentStats(
      [
        { marks: 80, attendance: 90, result: 'Pass' },
        { marks: 60, attendance: 70, result: 'Pass' },
        { marks: 30, attendance: 50, result: 'Fail' }
      ],
      DEFAULT_GRADING_POLICY.grades,
      DEFAULT_GRADING_POLICY.passMark
    );

    assert.equal(stats.subjects, 3);
    assert.equal(stats.averageMarks, 170 / 3);
    assert.equal(stats.averageAttendance, 70);
    assert.equal(stats.passRate, (2 / 3) * 100);
    assert.equal(stats.overallGrade, 'D');
    assert.equal(stats.gpa, (170 / 3 / 10).toFixed(2));
  });

  it('returns the existing empty-state values when no reports exist', () => {
    const stats = calculateStudentStats([], DEFAULT_GRADING_POLICY.grades, 40);

    assert.deepEqual(stats, {
      subjects: 0,
      averageMarks: 0,
      averageAttendance: 0,
      passRate: 0,
      overallGrade: '—',
      gpa: '—'
    });
  });
});
