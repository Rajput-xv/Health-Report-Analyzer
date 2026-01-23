const express = require('express');
const multer = require('multer');
const authMiddleware = require('../utils/authMiddleware');
const Report = require('../models/Report');
const User = require('../models/User');
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

/**
 * POST /api/upload
 * Upload and process medical report
 * Uses Gemini (primary) → OCR (fallback) → Manual entry
 */
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check subscription limits
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const uploadPermission = user.canUploadReport();
    if (!uploadPermission.allowed) {
      return res.status(403).json({
        error: 'Monthly upload limit reached',
        message: `You've used all ${uploadPermission.limit} reports this month. Upgrade to Pro for more uploads!`,
        upgradeRequired: true,
        used: uploadPermission.used,
        limit: uploadPermission.limit
      });
    }

    console.log(`\nProcessing upload: ${req.file.originalname} (${req.file.mimetype})`);
    console.log(`User: ${user.email} | Plan: ${user.subscription?.plan || 'free'} | Reports used: ${uploadPermission.used}/${uploadPermission.remaining === 'unlimited' ? '∞' : uploadPermission.limit}`);

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

    // Increment user's report usage count
    await user.incrementReportUsage();

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

    // Try to save a failed report for tracking
    try {
      const failedReport = new Report({
        userId: req.user.id,
        filename: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        extractedText: ' ',
        healthParameters: [],
        extractionMethod: 'failed',
        isScannedDocument: true,
        requiresManualEntry: true,
        processingStatus: 'failed',
        extractionLog: {
          error: error.message,
          totalTime: 0
        },
        createdAt: new Date()
      });

      const savedReport = await failedReport.save();

      return res.status(200).json({
        success: true,
        reportId: savedReport._id,
        filename: req.file.originalname,
        requiresManualEntry: true,
        healthParameters: [],
        extractedParameterCount: 0,
        message: 'Processing failed. Please enter data manually.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });

    } catch (saveError) {
      console.error('❌ Failed to save error report:', saveError);
    }

    res.status(500).json({
      error: 'Failed to process uploaded file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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