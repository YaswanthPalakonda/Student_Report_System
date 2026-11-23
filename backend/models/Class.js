import mongoose from 'mongoose';
export default mongoose.model('Class', new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  key: { type: String, required: true, unique: true },
}, { timestamps: true, optimisticConcurrency: true }));
