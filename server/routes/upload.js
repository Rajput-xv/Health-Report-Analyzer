const express = require('express');
const multer = require('multer');
const authMiddleware = require('../utils/authMiddleware');
const geminiLimiter = require('../utils/geminiLimiter');
const Report = require('../models/Report');
const User = require('../models/User');
const { PLANS, effectivePlan } = require('../config/plans');
const { extractHealthData, validateExtractionResults, getExtractionStats } = require('../services/extractionService');

const router = express.Router();

// Configure multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  }
});

// Check the real file type from its first bytes (the mimetype can be faked)
function hasValidSignature(buffer, mimetype) {
  if (!buffer || buffer.length < 5) return false;
  const isPdf = buffer.slice(0, 5).toString('latin1') === '%PDF-';
  const isJpg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
  switch (mimetype) {
    case 'application/pdf': return isPdf;
    case 'image/png': return isPng;
    case 'image/jpeg':
    case 'image/jpg': return isJpg;
    default: return false;
  }
}

// Turn multer's upload errors (bad type / too large) into clean 400/413 responses
const uploadSingle = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({ error: err.message });
    }
    // fileFilter rejection (e.g. unsupported type)
    return res.status(400).json({ error: err.message || 'Invalid file upload' });
  });
};

/**
 * POST /api/upload
 * Upload and process medical report
 * Uses Gemini (primary) → OCR (fallback) → Manual entry
 */
router.post('/', authMiddleware, geminiLimiter, uploadSingle, async (req, res) => {
  let releaseSlot = false;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Make sure the bytes actually match an allowed type
    if (!hasValidSignature(req.file.buffer, req.file.mimetype)) {
      return res.status(400).json({ error: 'File content does not match an allowed type (PDF, JPG, or PNG).' });
    }

    // Check subscription limits
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Take the slot before the slow extraction so parallel uploads can't all pass the check
    const plan = effectivePlan(user.subscription);
    const limit = PLANS[plan].reportsPerMonth;
    if (!await User.reserveReport(req.user.id, limit)) {
      return res.status(403).json({
        error: 'Monthly upload limit reached',
        message: `You've used all ${limit} reports this month. Upgrade to Pro for more uploads!`,
        upgradeRequired: true,
        used: limit,
        limit
      });
    }
    releaseSlot = true;

    console.log(`\nProcessing upload: ${req.file.mimetype}, ${req.file.size} bytes | Plan: ${plan}`);

    // Extract options from query/body
    const options = {
      forceMethod: req.query.method || req.body.method || null, // 'gemini', 'ocr', or null
      preferGemini: req.query.preferGemini !== 'false', // Default true
      includeInsights: req.query.insights !== 'false' // Default true
    };

    // Extract health data using hybrid service
    const extractionResult = await extractHealthData(
      req.file.buffer,
      req.file.mimetype,
      options
    );

    // Validate extraction results
    const validation = validateExtractionResults(extractionResult);
    if (!validation.isValid && !extractionResult.requiresManualEntry) {
      console.warn('⚠️  Extraction validation issues:', validation.issues);
    }

    // Get extraction statistics for logging
    const stats = getExtractionStats(extractionResult);
    console.log('📊 Extraction stats:', stats);

    // Prepare report data
    const reportData = {
      userId: req.user.id,
      filename: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      extractedText: extractionResult.extractedText || ' ',
      healthParameters: extractionResult.healthParameters || [],
      extractionMethod: extractionResult.method,
      isScannedDocument: extractionResult.isScannedDocument || false,
      requiresManualEntry: extractionResult.requiresManualEntry || false,
      processingStatus: extractionResult.requiresManualEntry ? 'manual_entry_needed' : 'completed',
      extractionLog: extractionResult.extractionLog,
      createdAt: new Date()
    };

    // Add Gemini-specific data if available
    if (extractionResult.method === 'gemini') {
      if (extractionResult.aiInsights) {
        reportData.aiInsights = extractionResult.aiInsights;
      }
      if (extractionResult.patientInfo) {
        reportData.patientInfo = extractionResult.patientInfo;
      }
      if (extractionResult.metadata) {
        reportData.geminiMetadata = extractionResult.metadata;
      }
    } else if (extractionResult.aiInsights) {
      // OCR with basic insights
      reportData.aiInsights = extractionResult.aiInsights;
    }

    // Save report to database
    const report = new Report(reportData);
    const savedReport = await report.save();

    // Failed extractions don't count against the monthly limit
    releaseSlot = !extractionResult.healthParameters?.length;

    console.log(`✅ Report saved: ${savedReport._id} (${extractionResult.method})`);

    // Prepare response based on extraction method
    const response = {
      success: true,
      reportId: savedReport._id,
      filename: req.file.originalname,
      extractionMethod: extractionResult.method,
      healthParameters: extractionResult.healthParameters,
      extractedParameterCount: extractionResult.healthParameters?.length || 0,
      processingTime: stats.processingTime
    };

    // Add insights if available
    if (extractionResult.aiInsights) {
      response.aiInsights = {
        summary: extractionResult.aiInsights.summary,
        riskLevel: extractionResult.aiInsights.riskLevel,
        outlierCount: extractionResult.aiInsights.outliers?.length || 0,
        recommendationCount: extractionResult.aiInsights.recommendations?.length || 0
      };
    }

    // Add warnings/messages based on extraction result
    if (extractionResult.requiresManualEntry) {
      response.requiresManualEntry = true;
      response.message = extractionResult.method === 'failed'
        ? "Could not automatically extract data. Please enter data manually."
        : "Limited data extracted. You may need to verify and complete manually.";
    } else if (extractionResult.isScannedDocument) {
      response.isScannedDocument = true;
      response.message = `Extracted ${response.extractedParameterCount} parameters from scanned document. Please verify accuracy.`;
    } else {
      response.message = extractionResult.method === 'gemini'
        ? `Successfully processed with AI. Found ${response.extractedParameterCount} parameters with insights.`
        : `Successfully processed with OCR. Found ${response.extractedParameterCount} parameters.`;
    }

    // Add extraction log for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      response.extractionLog = extractionResult.extractionLog;
    }

    res.json(response);

  } catch (error) {
    console.error('❌ Upload processing error:', error);
    res.status(500).json({
      error: 'Failed to process uploaded file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (releaseSlot) {
      await User.releaseReport(req.user.id).catch(err => console.error('Failed to release upload slot:', err.message));
    }
  }
});

/**
 * GET /api/upload/stats
 * Get upload/extraction statistics for the user
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const analytics = await Report.getAnalytics(req.user.id);
    res.json(analytics);
  } catch (error) {
    console.error('Failed to get upload stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

module.exports = router;