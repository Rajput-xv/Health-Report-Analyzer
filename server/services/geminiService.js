const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Extracts health parameters and generates insights from medical report image/PDF
 * @param {Buffer} fileBuffer - The file buffer (image or PDF)
 * @param {string} mimeType - File MIME type
 * @returns {Promise<Object>} Extracted data with insights
 */
async function extractWithGemini(fileBuffer, mimeType) {
  const startTime = Date.now();

  try {
    console.log('Starting Gemini extraction...');

    // Use Gemini Flash for cost-efficiency
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Convert buffer to base64 for Gemini
    const base64Data = fileBuffer.toString('base64');

    // UPDATED PROMPT: Support both numeric and categorical data
    const prompt = `You are a medical lab report analyzer. Extract ALL health parameters from this lab report image.

IMPORTANT INSTRUCTIONS:
1. Extract EVERY parameter you can find (blood tests, vitals, medical history, symptoms, diagnoses, etc.)
2. For NUMERIC parameters (lab values, vitals): provide value as a number
3. For CATEGORICAL/TEXT parameters (symptoms, conditions, history): provide value as 0 and include the actual text in "textValue"
4. Determine status: "Normal", "High", "Low", "Abnormal", or "Unknown"
5. Set parameterType: "numeric" for numbers, "categorical" for yes/no/conditions, "text" for descriptions
6. Extract patient information if visible
7. Provide medical insights with outliers and recommendations

Return ONLY valid JSON in this EXACT format (no markdown, no code blocks):
{
  "patientInfo": {
    "name": "patient name or null",
    "age": "age or null",
    "gender": "gender or null",
    "testDate": "date or null",
    "hospital": "hospital name or null"
  },
  "parameters": [
    {
      "name": "Parameter Name",
      "value": 123.45,
      "unit": "mg/dL",
      "normalRange": "70-100",
      "status": "Normal",
      "category": "Lipid Panel",
      "parameterType": "numeric",
      "textValue": null
    },
    {
      "name": "Hypertension Status",
      "value": 0,
      "unit": "",
      "normalRange": "N/A",
      "status": "Abnormal",
      "category": "Medical History",
      "parameterType": "categorical",
      "textValue": "Diagnosed 3 years ago, managing with medication"
    }
  ],
  "insights": {
    "summary": "Brief overall health summary",
    "outliers": [
      {
        "parameter": "Cholesterol",
        "value": 250,
        "normalRange": "125-200",
        "severity": "Moderate",
        "concern": "Elevated cholesterol increases cardiovascular risk",
        "recommendation": "Consult cardiologist for management plan"
      }
    ],
    "recommendations": [
      "Consult doctor about elevated cholesterol",
      "Consider dietary modifications"
    ],
    "riskLevel": "Low",
    "positiveFindings": [
      "Blood pressure within optimal range"
    ]
  },
  "extractedText": "full text content from the report",
  "confidence": 0.95
}

VALID STATUS VALUES: "Normal", "High", "Low", "Abnormal", "Unknown"
VALID SEVERITY VALUES: "Mild", "Moderate", "Severe"
VALID RISK LEVELS: "Low", "Moderate", "High"
VALID PARAMETER TYPES: "numeric", "categorical", "text", "boolean"`;

    // Generate content with image
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();

    console.log('Gemini raw response length:', text.length);

    // Parse JSON response (handle potential markdown code blocks)
    let jsonText = text.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    const parsedData = JSON.parse(jsonText);

    // Validate the response structure
    if (!parsedData.parameters || !Array.isArray(parsedData.parameters)) {
      throw new Error('Invalid response structure from Gemini');
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Gemini extraction successful: ${parsedData.parameters.length} parameters in ${processingTime}ms`);

    // Transform and sanitize parameters
    const healthParameters = parsedData.parameters.map(p => {
      const param = {
        name: p.name || 'Unknown',
        unit: p.unit || '',
        normalRange: p.normalRange || 'N/A',
        category: p.category || 'General',
        parameterType: p.parameterType || 'numeric'
      };

      // Handle numeric vs categorical values
      if (p.parameterType === 'categorical' || p.parameterType === 'text' || p.parameterType === 'boolean') {
        // For categorical/text, store the text and use 0 as placeholder
        param.value = 0;
        param.textValue = p.textValue || String(p.value) || 'N/A';
      } else {
        // For numeric values, parse as number
        const numValue = parseFloat(p.value);
        param.value = isNaN(numValue) ? 0 : numValue;
        param.textValue = p.textValue || null;
      }

      // Sanitize status to match enum
      param.status = sanitizeStatus(p.status);

      return param;
    });

    // Sanitize insights
    const insights = parsedData.insights || {};
    const aiInsights = {
      summary: insights.summary || '',
      outliers: (insights.outliers || []).map(o => ({
        parameter: o.parameter || '',
        value: parseFloat(o.value) || 0,
        normalRange: o.normalRange || '',
        severity: sanitizeSeverity(o.severity),
        concern: o.concern || '',
        recommendation: o.recommendation || ''
      })),
      recommendations: insights.recommendations || [],
      riskLevel: sanitizeRiskLevel(insights.riskLevel),
      positiveFindings: insights.positiveFindings || [],
      trendsToMonitor: insights.trendsToMonitor || [],
      lifestyle: insights.lifestyle || {}
    };

    // Return standardized format
    return {
      success: true,
      method: 'gemini',
      extractedText: parsedData.extractedText || '',
      patientInfo: parsedData.patientInfo || {},
      healthParameters: healthParameters,
      aiInsights: aiInsights,
      metadata: {
        model: 'gemini-2.5-flash',
        processingTime: processingTime,
        confidence: parsedData.confidence || 0.8,
        parameterCount: healthParameters.length
      }
    };

  } catch (error) {
    console.error('❌ Gemini extraction failed:', error.message);

    // Return structured error for fallback handling
    return {
      success: false,
      method: 'gemini',
      error: error.message,
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * Sanitize status values to match schema enum
 */
function sanitizeStatus(status) {
  if (!status) return 'Unknown';

  const normalized = String(status).toLowerCase().trim();

  // Map various inputs to valid enum values
  if (normalized.includes('normal') || normalized === 'within range') return 'Normal';
  if (normalized.includes('high') || normalized.includes('elevated')) return 'High';
  if (normalized.includes('low') || normalized.includes('decreased')) return 'Low';
  if (normalized.includes('abnormal') || normalized.includes('diagnosed')) return 'Abnormal';
  if (normalized.includes('present')) return 'Present';
  if (normalized.includes('absent') || normalized.includes('none')) return 'Absent';

  return 'Unknown';
}

/**
 * Sanitize severity values to match schema enum
 */
function sanitizeSeverity(severity) {
  if (!severity) return 'Unknown';

  const normalized = String(severity).toLowerCase().trim();

  if (normalized === 'mild' || normalized === 'low') return 'Mild';
  if (normalized === 'moderate') return 'Moderate';
  if (normalized === 'severe' || normalized === 'high' || normalized === 'critical') return 'Severe';

  return 'Unknown';
}

/**
 * Sanitize risk level to match schema enum
 */
function sanitizeRiskLevel(riskLevel) {
  if (!riskLevel) return 'Unknown';

  const normalized = String(riskLevel).toLowerCase().trim();

  if (normalized === 'low') return 'Low';
  if (normalized === 'moderate' || normalized === 'medium') return 'Moderate';
  if (normalized === 'high' || normalized === 'severe') return 'High';

  return 'Unknown';
}

/**
 * Re-analyze an existing report to generate new insights
 * Useful for updating old reports with new AI capabilities
 * @param {Object} report - Existing report from database
 * @returns {Promise<Object>} New insights
 */
async function reanalyzeReport(report) {
  try {
    console.log('🔄 Re-analyzing report with Gemini...');

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a medical advisor. Analyze these lab test results and provide insights.

Lab Results:
${JSON.stringify(report.healthParameters, null, 2)}

Patient Context:
- Previous reports: ${report.previousReportCount || 0}
- Test date: ${report.createdAt}

Provide detailed analysis in JSON format:
{
  "summary": "overall health assessment",
  "outliers": [
    {
      "parameter": "name",
      "value": 123,
      "normalRange": "range",
      "severity": "Mild",
      "concern": "medical explanation",
      "recommendation": "specific action"
    }
  ],
  "recommendations": [
    "specific actionable recommendations"
  ],
  "riskLevel": "Low",
  "positiveFindings": ["things that are good"],
  "trendsToMonitor": ["parameters to watch"],
  "lifestyle": {
    "diet": ["dietary suggestions"],
    "exercise": ["exercise suggestions"],
    "habits": ["lifestyle modifications"]
  }
}

VALID SEVERITY: "Mild", "Moderate", "Severe"
VALID RISK LEVEL: "Low", "Moderate", "High"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();

    // Clean markdown
    if (text.startsWith('```json')) {
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/```\n?/g, '');
    }

    const insights = JSON.parse(text);

    // Sanitize the insights
    const sanitizedInsights = {
      summary: insights.summary || '',
      outliers: (insights.outliers || []).map(o => ({
        parameter: o.parameter || '',
        value: o.value || 0,
        normalRange: o.normalRange || '',
        severity: sanitizeSeverity(o.severity),
        concern: o.concern || '',
        recommendation: o.recommendation || ''
      })),
      recommendations: insights.recommendations || [],
      riskLevel: sanitizeRiskLevel(insights.riskLevel),
      positiveFindings: insights.positiveFindings || [],
      trendsToMonitor: insights.trendsToMonitor || [],
      lifestyle: insights.lifestyle || {}
    };

    console.log('✅ Re-analysis complete');

    return {
      success: true,
      insights: sanitizedInsights,
      analyzedAt: new Date()
    };

  } catch (error) {
    console.error('❌ Re-analysis failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate comparative analysis between multiple reports
 * @param {Array<Object>} reports - Array of user reports (sorted by date)
 * @returns {Promise<Object>} Trend analysis
 */
async function generateTrendAnalysis(reports) {
  try {
    if (reports.length < 2) {
      return {
        success: false,
        error: 'Need at least 2 reports for trend analysis'
      };
    }

    console.log(`📊 Analyzing trends across ${reports.length} reports...`);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Prepare data for analysis
    const reportData = reports.map(r => ({
      date: r.createdAt,
      parameters: r.healthParameters
    }));

    const prompt = `You are a medical data analyst. Analyze these lab results over time and identify trends.

Historical Data:
${JSON.stringify(reportData, null, 2)}

Provide trend analysis in JSON:
{
  "overallTrend": "improving/stable/declining",
  "parameterTrends": [
    {
      "parameter": "name",
      "trend": "increasing/decreasing/stable",
      "changePercent": 15.5,
      "concern": "explanation if concerning",
      "action": "recommended action"
    }
  ],
  "insights": [
    "key insights about health trajectory"
  ],
  "warnings": [
    "any concerning patterns"
  ],
  "recommendations": [
    "long-term health suggestions"
  ]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();

    if (text.startsWith('```json')) {
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/```\n?/g, '');
    }

    const analysis = JSON.parse(text);

    console.log('✅ Trend analysis complete');

    return {
      success: true,
      analysis: analysis,
      reportCount: reports.length,
      dateRange: {
        from: reports[0].createdAt,
        to: reports[reports.length - 1].createdAt
      }
    };

  } catch (error) {
    console.error('❌ Trend analysis failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  extractWithGemini,
  reanalyzeReport,
  generateTrendAnalysis
};