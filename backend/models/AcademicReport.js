import mongoose from 'mongoose';
const ref = model => ({ type: mongoose.Schema.Types.ObjectId, ref: model, required: true });
const schema = new mongoose.Schema({
  student: ref('User'), class: ref('Class'), subject: ref('Subject'), teacher: ref('User'),
  testMarks: { type: Number, required: true, min: 0, max: 40 },
  examMarks: { type: Number, required: true, min: 0, max: 60 },
  marks: { type: Number, required: true, min: 0, max: 100 },
  percentage: { type: Number, required: true, min: 0, max: 100 },
  grade: { type: String, required: true },
  result: { type: String, enum: ['Pass', 'Fail'], required: true },
  attendance: { type: Number, required: true, min: 0, max: 100 },
  attendanceStatus: { type: String, enum: ['Present', 'Absent', 'Late'], required: true },
  remarks: { type: String, default: '', maxlength: 2000 },
  gradingSnapshot: { passMark: Number, grades: [{ _id: false, label: String, min: Number }], version: Number },
}, { timestamps: true, optimisticConcurrency: true });
schema.index({ student: 1, class: 1, subject: 1 }, { unique: true });
schema.index({ class: 1, subject: 1 });
export default mongoose.model('AcademicReport', schema);
