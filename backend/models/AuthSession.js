import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  _id: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  csrf: { type: String, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true });
export default mongoose.model('AuthSession', schema);
