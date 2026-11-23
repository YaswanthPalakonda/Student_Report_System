import mongoose from 'mongoose';
const ref = model => ({ type: mongoose.Schema.Types.ObjectId, ref: model, required: true });
const schema = new mongoose.Schema({ teacher: ref('User'), class: ref('Class'), subject: ref('Subject') }, { timestamps: true, optimisticConcurrency: true });
schema.index({ teacher: 1, class: 1, subject: 1 }, { unique: true });
export default mongoose.model('TeacherAssignment', schema);
