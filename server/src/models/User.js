import mongoose from 'mongoose';

import { MANAGEABLE_ROLES, ROLES } from '../utils/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
      maxlength: [120, 'Name must be at most 120 characters.']
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [254, 'Email must be at most 254 characters.']
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      required: true,
      enum: {
        values: Object.values(ROLES),
        message: 'Role must be admin, teacher or student.'
      },
      index: true
    },
    className: {
      type: String,
      trim: true,
      default: '',
      maxlength: [120, 'Class name must be at most 120 characters.']
    },
    studentId: {
      type: String,
      trim: true,
      default: '',
      maxlength: [60, 'Student ID must be at most 60 characters.']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    tokenVersion: {
      type: Number,
      default: 0,
      select: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

userSchema.index({ role: 1, className: 1 });
userSchema.index({ studentId: 1 });

userSchema.path('role').validate(function validateManageableRole(value) {
  // Admins are created only by the seed script, never through the user API.
  return value === ROLES.ADMIN || MANAGEABLE_ROLES.includes(value);
}, 'Invalid role.');

export const User = mongoose.model('User', userSchema);
