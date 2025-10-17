const { extractWithGemini } = require('./geminiService');
const { extractWithOCR } = require('./ocrService');

/**
 * Smart hybrid extraction service
 * Tries Gemini first, falls back to OCR if needed
 * 
 * This is the MAIN entry point for report extraction
 */

/**
 * Extract health data from uploaded file
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} mimeType - File MIME type
 * @param {Object} options - Extraction options
 * @returns {Promise<Object>} Extraction results
 */
async function extractHealthData(fileBuffer, mimeType, options = {}) {
    const {
        forceMethod = null, // 'gemini', 'ocr', or null for auto
        preferGemini = true, // Use Gemini by default
        includeInsights = true // Generate AI insights
    } = options;

    console.log('Starting hybrid extraction...');
    console.log(`   Method: ${forceMethod || 'auto (Gemini → OCR fallback)'}`);
    console.log(`   File: ${mimeType}, ${(fileBuffer.length / 1024).toFixed(1)}KB`);

    const extractionLog = {
        attempts: [],
        finalMethod: null,
        totalTime: 0
    };

    const startTime = Date.now();

    try {
        // Force specific method if requested
        if (forceMethod === 'ocr') {
            console.log('⚡ Forced OCR extraction');
            const result = await extractWithOCR(fileBuffer, mimeType);
            extractionLog.attempts.push({ method: 'ocr', success: result.success });
            extractionLog.finalMethod = 'ocr';
            extractionLog.totalTime = Date.now() - startTime;

            return {
                ...result,
                extractionLog
            };
        }

        if (forceMethod === 'gemini') {
            console.log('⚡ Forced Gemini extraction');
            const result = await extractWithGemini(fileBuffer, mimeType);
            extractionLog.attempts.push({ method: 'gemini', success: result.success });

            if (!result.success) {
                throw new Error('Gemini extraction failed (forced mode)');
            }

            extractionLog.finalMethod = 'gemini';
            extractionLog.totalTime = Date.now() - startTime;

            return {
                ...result,
                extractionLog
            };
        }

        // AUTO MODE: Try Gemini first, fallback to OCR
        if (preferGemini && process.env.GEMINI_API_KEY) {
            console.log('Attempting Gemini extraction (primary)...');

            const geminiResult = await extractWithGemini(fileBuffer, mimeType);
            extractionLog.attempts.push({
                method: 'gemini',
                success: geminiResult.success,
                processingTime: geminiResult.metadata?.processingTime
            });

            // If Gemini succeeds and found parameters, use it
            if (geminiResult.success && geminiResult.healthParameters.length > 0) {
                console.log('✅ Gemini extraction successful!');
                extractionLog.finalMethod = 'gemini';
                extractionLog.totalTime = Date.now() - startTime;

                return {
                    ...geminiResult,
                    extractionLog
                };
            }

            // If Gemini failed or found nothing, try OCR
            console.log('⚠️  Gemini found no parameters, falling back to OCR...');
        } else {
            console.log('⚠️  Gemini API key not configured, using OCR directly');
        }

        // Fallback to OCR
        console.log('Attempting OCR extraction (fallback)...');
        const ocrResult = await extractWithOCR(fileBuffer, mimeType);
        extractionLog.attempts.push({
            method: 'ocr',
            success: ocrResult.success,
            processingTime: ocrResult.metadata?.processingTime
        });

        if (!ocrResult.success) {
            throw new Error('Both Gemini and OCR extraction failed');
        }

        console.log('✅ OCR extraction successful!');
        extractionLog.finalMethod = 'ocr';
        extractionLog.totalTime = Date.now() - startTime;

        // OCR doesn't provide insights, so add empty structure
        return {
            ...ocrResult,
            aiInsights: includeInsights ? generateBasicInsights(ocrResult.healthParameters) : null,
            extractionLog
        };

    } catch (error) {
        console.error('❌ All extraction methods failed:', error.message);
        extractionLog.totalTime = Date.now() - startTime;
        extractionLog.error = error.message;

        // Return failure result that allows manual entry
        return {
            success: false,
            method: 'failed',
            extractedText: ' ',
            healthParameters: [],
            isScannedDocument: true,
            requiresManualEntry: true,
            error: error.message,
            extractionLog
        };
    }
}

/**
 * Generate basic insights when OCR is used (no AI)
 * This provides minimal insights for OCR extractions
 */
function generateBasicInsights(healthParameters) {
    const outliers = healthParameters.filter(p =>
        p.status === 'High' || p.status === 'Low'
    );

    const recommendations = [];
    if (outliers.length > 0) {
        recommendations.push('Some parameters are outside normal range - consult your healthcare provider');
    } else if (healthParameters.length > 0) {
        recommendations.push('All measured parameters appear to be within normal ranges');
    }

    return {
        summary: outliers.length > 0
            ? `${outliers.length} parameter(s) outside normal range detected`
            : 'All parameters within normal ranges',
        outliers: outliers.map(p => ({
            parameter: p.name,
            value: p.value,
            normalRange: p.normalRange,
            severity: 'Unknown',
            concern: `${p.name} is ${p.status.toLowerCase()}`
        })),
        recommendations: recommendations,
        riskLevel: outliers.length > 2 ? 'Moderate' : outliers.length > 0 ? 'Low' : 'Low',
        positiveFindings: healthParameters
            .filter(p => p.status === 'Normal')
            .map(p => `${p.name} is within normal range`)
    };
}

/**
 * Validate extraction results
 * Ensures data quality before saving to database
 */
function validateExtractionResults(results) {
    const issues = [];

    if (!results.success) {
        issues.push('Extraction not successful');
    }

    if (!results.healthParameters || results.healthParameters.length === 0) {
        if (!results.requiresManualEntry) {
            issues.push('No parameters extracted but manual entry not flagged');
        }
    }

    // Validate each parameter
    results.healthParameters?.forEach((param, index) => {
        if (!param.name || param.name.trim() === '') {
            issues.push(`Parameter ${index}: Missing name`);
        }
        if (param.value === null || param.value === undefined || isNaN(param.value)) {
            issues.push(`Parameter ${index} (${param.name}): Invalid value`);
        }
    });

    return {
        isValid: issues.length === 0,
        issues: issues
    };
}

/**
 * Get extraction statistics for monitoring
 */
function getExtractionStats(results) {
    return {
        method: results.method,
        success: results.success,
        parameterCount: results.healthParameters?.length || 0,
        processingTime: results.metadata?.processingTime || results.extractionLog?.totalTime,
        hasInsights: !!results.aiInsights,
        requiresManualEntry: results.requiresManualEntry,
        attemptedMethods: results.extractionLog?.attempts?.map(a => a.method) || []
    };
}

module.exports = {
    extractHealthData,
    validateExtractionResults,
    getExtractionStats,
    generateBasicInsights
};