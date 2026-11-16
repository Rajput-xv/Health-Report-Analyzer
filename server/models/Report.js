const mongoose = require('mongoose');

const healthParameterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  // CHANGED: Support both numeric and text values
  value: {
    type: mongoose.Schema.Types.Mixed, // Can be Number or String
    required: true
  },
  // CHANGED: Made optional for categorical parameters
  unit: {
    type: String,
    required: false,
    default: ''
  },
  // CHANGED: Made optional
  normalRange: {
    type: String,
    required: false,
    default: 'N/A'
  },
  // CHANGED: Expanded enum to handle more cases
  status: {
    type: String,
    enum: ['Normal', 'High', 'Low', 'Abnormal', 'Unknown', 'Present', 'Absent', 'N/A'],
    default: 'Unknown'
  },
  category: {
    type: String,
    required: false
  },
  // NEW: Track if this is a categorical or numeric parameter
  parameterType: {
    type: String,
    enum: ['numeric', 'categorical', 'boolean', 'text'],
    default: 'numeric'
  },
  // NEW: For categorical values, store the raw text
  textValue: {
    type: String,
    required: false
  }
});

// NEW: AI Insights Schema
const outlierSchema = new mongoose.Schema({
  parameter: String,
  value: mongoose.Schema.Types.Mixed, // Support both number and string
  normalRange: String,
  severity: {
    type: String,
    enum: ['Mild', 'Moderate', 'Severe', 'Unknown', 'Low', 'High'] // Added Low/High
  },
  concern: String,
  recommendation: String
}, { _id: false });

const aiInsightsSchema = new mongoose.Schema({
  summary: String,
  outliers: [outlierSchema],
  recommendations: [String],
  riskLevel: {
    type: String,
    enum: ['Low', 'Moderate', 'High', 'Unknown']
  },
  positiveFindings: [String],
  trendsToMonitor: [String],
  lifestyle: {
    diet: [String],
    exercise: [String],
    habits: [String]
  },
  generatedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// NEW: Patient Info Schema (extracted by Gemini)
const patientInfoSchema = new mongoose.Schema({
  name: String,
  age: String,
  gender: String,
  testDate: String,
  hospital: String
}, { _id: false });

const reportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  extractedText: {
    type: String,
    required: false,
    default: ''
  },
  healthParameters: [healthParameterSchema],
  fileSize: {
    type: Number,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },

  // NEW: Extraction method tracking
  extractionMethod: {
    type: String,
    enum: ['gemini', 'ocr', 'manual', 'failed'],
    default: 'ocr'
  },

  // NEW: AI-generated insights
  aiInsights: {
    type: aiInsightsSchema,
    required: false
  },

  // NEW: Patient information (if extracted)
  patientInfo: {
    type: patientInfoSchema,
    required: false
  },

  // NEW: Gemini metadata
  geminiMetadata: {
    model: String,
    processingTime: Number,
    confidence: Number,
    parameterCount: Number
  },

  // NEW: Extraction log for debugging
  extractionLog: {
    attempts: [{
      method: String,
      success: Boolean,
      processingTime: Number
    }],
    finalMethod: String,
    totalTime: Number,
    error: String
  },

  // Existing fields
  isScannedDocument: {
    type: Boolean,
    default: false
  },
  requiresManualEntry: {
    type: Boolean,
    default: false
  },
  processingStatus: {
    type: String,
    enum: ['processing', 'completed', 'failed', 'manual_entry_needed', 'manual_entry_completed'],
    default: 'completed'
  },

  // NEW: Track if insights were regenerated
  insightsRegeneratedAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
});

// Indexes for faster queries
reportSchema.index({ userId: 1, createdAt: -1 });

// Static methods
reportSchema.statics.getAnalytics = async function (userId) {
  const reports = await this.find({ userId })
    .select('extractionMethod aiInsights.riskLevel healthParameters._id')
    .lean();

  return {
    totalReports: reports.length,
    methodBreakdown: {
      gemini: reports.filter(r => r.extractionMethod === 'gemini').length,
      ocr: reports.filter(r => r.extractionMethod === 'ocr').length,
      manual: reports.filter(r => r.extractionMethod === 'manual').length
    },
    withInsights: reports.filter(r => r.aiInsights).length,
    averageParameters: reports.reduce((sum, r) => sum + r.healthParameters.length, 0) / reports.length || 0,
    highRiskReports: reports.filter(r => r.aiInsights?.riskLevel === 'High').length
  };
};

// IMPORTANT: Check if model exists before compiling (fixes nodemon hot-reload issue)
module.exports = mongoose.models.Report || mongoose.model('Report', reportSchema);