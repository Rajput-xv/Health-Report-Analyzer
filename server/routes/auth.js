const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');

const router = express.Router();

// Check if database is connected
const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1;
};

const generateToken = (userId) => {
  return jwt.sign(
    { 
      userId,
      iat: Math.floor(Date.now() / 1000),
      type: 'access'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.SESSION_EXPIRE || '7d' }
  );
};

// Register new user
router.post('/register', async (req, res) => {
  try {
    // Check if database is connected
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'Database is not available. Registration requires database connection. Please set up MongoDB to use authentication features.',
        dbStatus: 'disconnected',
        suggestion: 'You can still use the file upload and OCR features without registration.'
      });
    }

    const { email, password, confirm_password, firstName, lastName } = req.body;

    // Validation
    if (!email || !password || !confirm_password || !firstName || !lastName) {
      return res.status(400).json({
        error: 'All fields are required'
      });
    }

    // Check for strong password (match client-side validation)
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'
      });
    }

    if (password !== confirm_password) {
      return res.status(400).json({
        error: 'Passwords do not match'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists with this email'
      });
    }

    // Create new user
    const newUser = new User({
      email: email.toLowerCase(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      password: password
    });

    await newUser.save();

    // Generate token
    const token = generateToken(newUser._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: newUser.toSafeObject()
    });

  } catch (error) {
    console.error('User registration failed');
    res.status(500).json({
      error: 'Failed to register user'
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    // Check if database is connected
    if (!isDatabaseConnected()) {
      return res.status(503).json({
        error: 'Database is not available. Login requires database connection. Please set up MongoDB to use authentication features.',
        dbStatus: 'disconnected',
        suggestion: 'You can still use the file upload and OCR features without login.'
      });
    }

    const { email, password } = req.body;
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({
        error: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({
        error: 'Account is deactivated'
      });
    }

    // Special handling for Google-authenticated users who have reset their password
    console.log(`Login attempt for ${email}: Google Auth = ${user.googleAuth}, Password Changed = ${user.passwordChanged}`);

    // Check password - log comparison details for debugging
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log(`Login attempt for ${email}: Password validation result = ${isValidPassword}`);
    
    if (!isValidPassword) {
      return res.status(400).json({
        error: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: user.toSafeObject()
    });

  } catch (error) {
    console.error('Login attempt failed', error);
    res.status(500).json({
      error: 'Failed to login'
    });
  }
});

// Forgot Password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: "If the email exists, a reset link has been sent" });
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Save token and expiry to user
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // FRONTEND_URL should be set in your .env file (not committed) to your frontend URL
    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;


    // Send email
    // These email config variables should be set in your .env file:
    // For Gmail, you MUST use an App Password:
    // 1. Enable 2-Step Verification on your Google account
    // 2. Go to https://myaccount.google.com/apppasswords to create an App Password
    // 3. Use that 16-character password in your EMAIL_PASS environment variable
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // This MUST be an App Password for Gmail
      }
    });

    // Verify the connection configuration
    transporter.verify(function(error, success) {
      if (error) {
        console.error("SMTP Verification Error:", error);
      } else {
        console.log("SMTP server is ready to take our messages");
      }
    });

    await transporter.sendMail({
      from: `"Health Report Analyzer" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Password Reset Request",
      html: `<p>Click <a href="${resetURL}">here</a> to reset your password. Link valid for 1 hour.</p>`
    });

    res.json({ message: "If the email exists, a reset link has been sent" });
  } catch (err) {
    console.error("Password reset email error:", err);
    res.status(500).json({ message: "Server error", details: err.message });
  }
});

// Reset Password
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Disable the pre-save hook for password hashing
    // because we're going to hash it manually here
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    
    // Mark that this user has manually changed their password
    // This is important for Google-authenticated users
    user.passwordChanged = true;

    await user.save();

    console.log(`Password reset successful for user: ${user.email}`);

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Password reset error:", err);
    res.status(500).json({ message: "Server error", details: err.message });
  }
});


// Verify token and get user profile
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: 'Invalid token'
      });
    }

    res.json({
      success: true,
      user: user.toSafeObject()
    });

  } catch (error) {
    console.error('Token verification failed');
    res.status(401).json({
      error: 'Invalid token'
    });
  }
});

// Google Authentication
router.post('/google-auth', async (req, res) => {
  try {
    const { email, firstName, lastName } = req.body;
    
    if (!email) {
      return res.status(400).json({
        error: 'Email is required'
      });
    }

    // Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });
    
    // If user doesn't exist, create a new one
    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 12);
      
      user = new User({
        email: email.toLowerCase(),
        firstName: firstName || 'Google',
        lastName: lastName || 'User',
        password: hashedPassword,
        isActive: true,
        googleAuth: true
      });
      
      await user.save();
    } else {
      // Update user's name if it changed in Google
      if (firstName && firstName !== user.firstName) {
        user.firstName = firstName;
      }
      if (lastName && lastName !== user.lastName) {
        user.lastName = lastName;
      }
      // Mark as Google authenticated if not already set
      if (!user.googleAuth) {
        user.googleAuth = true;
      }
      await user.save();
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Google authentication successful',
      token,
      user: user.toSafeObject()
    });
  } catch (error) {
    console.error('Google auth failed', error.message);
    res.status(500).json({
      error: 'Failed to authenticate with Google'
    });
  }
});

module.exports = router;
