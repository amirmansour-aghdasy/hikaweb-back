import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {
  baseSchemaFields,
  baseSchemaMethods,
  baseSchemaStatics
} from '../../shared/models/baseModel.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: 100
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
      match: /^(\+98|0)?9\d{9}$/
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
      minLength: 8,
      select: false
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true
    },
    avatar: String,
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: true
    },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneNumberVerified: { type: Boolean, default: false },
    lastLogin: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
    refreshTokens: [
      {
        token: String,
        expiresAt: Date,
        createdAt: { type: Date, default: Date.now }
      }
    ],
    language: {
      type: String,
      enum: ['fa', 'en'],
      default: 'fa'
    },
    ...baseSchemaFields
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Methods
Object.assign(userSchema.methods, baseSchemaMethods);

userSchema.methods.matchPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.incrementLoginAttempts = function () {
  const updates = { $inc: { loginAttempts: 1 } };

  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }

  return this.updateOne(updates);
};

Object.assign(userSchema.statics, baseSchemaStatics);

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  return obj;
};

export const User = mongoose.model('User', userSchema);
