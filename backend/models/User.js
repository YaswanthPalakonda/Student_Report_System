import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'teacher', 'student'], required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', default: null },
  studentId: { type: String, trim: true, default: '' },
  active: { type: Boolean, default: true },
  authVersion: { type: Number, default: 0 },
}, { timestamps: true, optimisticConcurrency: true });
schema.index({ studentId: 1 }, { unique: true, partialFilterExpression: { studentId: { $gt: '' } } });
schema.index({ role: 1, class: 1, active: 1 });
export default mongoose.model('User', schema);
