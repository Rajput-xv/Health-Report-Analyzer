const mongoose = require('mongoose');
const bcrypt = require("bcryptjs");

// Subscription schema for Gumroad integration
const subscriptionSchema = new mongoose.Schema({
  plan: {
    type: String,
    enum: ['free', 'pro_monthly', 'pro_yearly', 'enterprise'],
    default: 'free'
  },
  status: {
    type: String,
    enum: ['active', 'past_due', 'cancelled', 'expired', 'trialing', 'paused', 'disputed'],
    default: 'active'
  },
  // Gumroad identifiers
  gumroadSubscriptionId: String,
  gumroadSubscriberId: String,
  gumroadSaleId: String,
  // Billing period
  currentPeriodStart: Date,
  renewsAt: Date,
  // Usage tracking
  reportsUsedThisMonth: {
    type: Number,
    default: 0
  },
  lastReportReset: {
    type: Date,
    default: Date.now
  },
  // Cancellation
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
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

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Method to get user without password
userSchema.methods.toSafeObject = function () {
  const user = this.toObject();
  delete user.password;
  return user;
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

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if user can upload reports based on subscription
userSchema.methods.canUploadReport = function () {
  const plan = this.subscription?.plan || 'free';
  const limits = {
    free: 3,
    pro_monthly: 10,
    pro_yearly: -1,
    enterprise: -1
  };

  const limit = limits[plan];
  if (limit === -1) return { allowed: true, remaining: 'unlimited' };

  const used = this.subscription?.reportsUsedThisMonth || 0;
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    remaining,
    limit,
    used
  };
};

// Method to increment report usage
userSchema.methods.incrementReportUsage = async function () {
  if (!this.subscription) {
    this.subscription = { plan: 'free', reportsUsedThisMonth: 0 };
  }
  this.subscription.reportsUsedThisMonth = (this.subscription.reportsUsedThisMonth || 0) + 1;
  await this.save();
  return this.subscription.reportsUsedThisMonth;
};

// Static method to reset monthly usage for all users (run via cron)
userSchema.statics.resetMonthlyUsage = async function () {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const result = await this.updateMany(
    { 'subscription.lastReportReset': { $lt: startOfMonth } },
    {
      $set: {
        'subscription.reportsUsedThisMonth': 0,
        'subscription.lastReportReset': new Date()
      }
    }
  );

  console.log(`Reset monthly usage for ${result.modifiedCount} users`);
  return result.modifiedCount;
};

module.exports = mongoose.model('User', userSchema);
