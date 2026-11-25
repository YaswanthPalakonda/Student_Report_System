import mongoose from 'mongoose';

const gradeSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20
    },
    min: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    }
  },
  { _id: false }
);

const gradingPolicySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'default'
    },
    passMark: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    grades: {
      type: [gradeSchema],
      required: true,
      validate: {
        validator: grades => Array.isArray(grades) && grades.length > 0,
        message: 'At least one grade threshold is required.'
      }
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

export const GradingPolicy = mongoose.model('GradingPolicy', gradingPolicySchema);
