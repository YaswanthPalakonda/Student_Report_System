import mongoose from 'mongoose';

import { ATTENDANCE_STATUSES, RESULTS } from '../utils/constants.js';

const reportSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    studentEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    studentName: {
      type: String,
      required: true,
      trim: true
    },
    studentId: {
      type: String,
      trim: true,
      default: ''
    },
    className: {
      type: String,
      trim: true,
      default: ''
    },
    subject: {
      type: String,
      required: [true, 'Subject is required.'],
      trim: true,
      maxlength: [120, 'Subject must be at most 120 characters.']
    },
    testMarks: {
      type: Number,
      required: true,
      min: 0,
      max: 40
    },
    examMarks: {
      type: Number,
      required: true,
      min: 0,
      max: 60
    },
    marks: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    grade: {
      type: String,
      required: true,
      trim: true
    },
    result: {
      type: String,
      required: true,
      enum: RESULTS
    },
    attendance: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    attendanceStatus: {
      type: String,
      required: true,
      enum: ATTENDANCE_STATUSES,
      default: 'Present'
    },
    remarks: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Remarks must be at most 2000 characters.']
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    teacherEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    teacherName: {
      type: String,
      required: true,
      trim: true
    },
    date: {
      type: String,
      default: () => new Date().toISOString().slice(0, 10)
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

reportSchema.index({ student: 1, createdAt: -1 });
reportSchema.index({ teacher: 1, createdAt: -1 });
reportSchema.index({ className: 1, subject: 1 });
reportSchema.index({ result: 1 });

export const Report = mongoose.model('Report', reportSchema);
