import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true, enum: ['default'] },
  passMark: { type: Number, required: true, min: 0, max: 100 },
  grades: [{ _id: false, label: { type: String, required: true }, min: { type: Number, min: 0, max: 100, required: true } }],
}, { timestamps: true, optimisticConcurrency: true });
export default mongoose.model('GradingSettings', schema);
