import mongoose from 'mongoose';

const teacherAssignmentSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
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
    className: {
      type: String,
      required: [true, 'Class name is required.'],
      trim: true,
      maxlength: [120, 'Class name must be at most 120 characters.']
    },
    subject: {
      type: String,
      required: [true, 'Subject is required.'],
      trim: true,
      maxlength: [120, 'Subject must be at most 120 characters.']
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

teacherAssignmentSchema.index({ teacher: 1 });
teacherAssignmentSchema.index({ className: 1, subject: 1 });
teacherAssignmentSchema.index(
  { teacher: 1, className: 1, subject: 1 },
  {
    unique: true,
    name: 'unique_teacher_class_subject',
    collation: { locale: 'en', strength: 2 }
  }
);

export const TeacherAssignment = mongoose.model('TeacherAssignment', teacherAssignmentSchema);
