const mongoose = require('mongoose');
const bcrypt = require("bcryptjs");

const USAGE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

// Subscription schema for Gumroad integration
const subscriptionSchema = new mongoose.Schema({
  plan: {
    type: String,
    enum: ['free', 'pro_monthly', 'pro_yearly', 'enterprise'],
    default: 'free'
  },
  status: {
    type: String,
    enum: ['active', 'past_due', 'cancelled', 'expired', 'trialing', 'paused', 'disputed', 'refunded'],
    default: 'active'
  },
  // Gumroad identifiers
  gumroadSubscriptionId: String,
  gumroadSaleId: String,
  // End of the paid period
  renewsAt: Date,
  // Usage tracking
  reportsUsedThisMonth: {
    type: Number,
    default: 0
  },
  lastReportReset: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  googleAuth: {
    type: Boolean,
    default: false
  },
  passwordChanged: {
    type: Boolean,
    default: false
  },
  // Part of every JWT; bumping it signs the user out everywhere
  tokenVersion: {
    type: Number,
    default: 0
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpire: {
    type: Date,
    default: null
  },
  // Subscription data
  subscription: {
    type: subscriptionSchema,
    default: () => ({ plan: 'free', status: 'active', reportsUsedThisMonth: 0 })
  }
}, {
  timestamps: true // This adds createdAt and updatedAt fields
});

// A Gumroad sale or subscription can only ever back one account
userSchema.index(
  { 'subscription.gumroadSaleId': 1 },
  { unique: true, partialFilterExpression: { 'subscription.gumroadSaleId': { $type: 'string' } } }
);
userSchema.index(
  { 'subscription.gumroadSubscriptionId': 1 },
  { unique: true, partialFilterExpression: { 'subscription.gumroadSubscriptionId': { $type: 'string' } } }
);

userSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    email: this.email,
    firstName: this.firstName,
    lastName: this.lastName
  };
};

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  try {
    // Use a consistent salt rounds value of 10
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    console.error(`Error hashing password for user ${this._id}:`, error);
    next(error);
  }
});

userSchema.statics.resetUsageIfDue = function (userId) {
  return this.updateOne(
    {
      _id: userId,
      $or: [
        { 'subscription.lastReportReset': { $lt: new Date(Date.now() - USAGE_PERIOD_MS) } },
        { 'subscription.lastReportReset': null }
      ]
    },
    { $set: { 'subscription.reportsUsedThisMonth': 0, 'subscription.lastReportReset': new Date() } }
  );
};

// Atomically takes one upload slot. Resolves to null when the limit is used up; -1 means unlimited.
userSchema.statics.reserveReport = async function (userId, limit) {
  await this.resetUsageIfDue(userId);
  const filter = { _id: userId };
  if (limit !== -1) filter['subscription.reportsUsedThisMonth'] = { $not: { $gte: limit } };
  return this.findOneAndUpdate(filter, { $inc: { 'subscription.reportsUsedThisMonth': 1 } });
};

userSchema.statics.releaseReport = function (userId) {
  return this.updateOne(
    { _id: userId, 'subscription.reportsUsedThisMonth': { $gt: 0 } },
    { $inc: { 'subscription.reportsUsedThisMonth': -1 } }
  );
};

module.exports = mongoose.model('User', userSchema);
