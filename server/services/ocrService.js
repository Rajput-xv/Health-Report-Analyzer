const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const { extractHealthParameters } = require('../utils/parameterExtractor');

/**
 * Extract text and parameters using traditional OCR (Tesseract)
 * This is the fallback when Gemini fails or is unavailable
 */

// Auto-rotate detection
async function deskewImage(buffer) {
    try {
        const { data: { text } } = await Tesseract.recognize(buffer, 'eng', {
            logger: () => { },
            tessedit_pageseg_mode: Tesseract.PSM.AUTO_ONLY,
            tessedit_ocr_engine_mode: Tesseract.OEM.DEFAULT
        });

        if (text.length < 50) {
            const rotations = [90, 180, 270];
            let bestRotation = 0;
            let bestLength = text.length;

            for (const angle of rotations) {
                const rotatedBuffer = await sharp(buffer).rotate(angle).toBuffer();
                const { data: { text: rotatedText } } = await Tesseract.recognize(rotatedBuffer, 'eng', {
                    logger: () => { },
                    tessedit_pageseg_mode: Tesseract.PSM.AUTO_ONLY
                });

                if (rotatedText.length > bestLength) {
                    bestLength = rotatedText.length;
                    bestRotation = angle;
                }
            }

            if (bestRotation > 0) {
                console.log(`Auto-rotating image by ${bestRotation}°`);
                return sharp(buffer).rotate(bestRotation).toBuffer();
            }
        }

        return buffer;
    } catch (error) {
        console.warn('Deskew detection failed:', error.message);
        return buffer;
    }
}

// Quality scoring
function calculateQualityScore(text, confidence) {
    const charCount = text.length;
    const medicalTerms = ['glucose', 'cholesterol', 'hemoglobin', 'triglyceride', 'creatinine'];
    const medicalTermCount = medicalTerms.filter(term => text.toLowerCase().includes(term)).length;
    const unitPatterns = (text.match(/\d+\.?\d*\s*(mg\/dl|mmol\/l|g\/dl|%)/gi) || []).length;
    const tablePatterns = (text.match(/\w+\s*[:\-]\s*\d+/g) || []).length;

    const score = {
        content: charCount > 100 ? 50 : charCount * 0.3,
        structure: tablePatterns * 8,
        medicalContent: medicalTermCount * 15,
        units: unitPatterns * 12,
        confidence: confidence * 0.4
    };

    return {
        total: Object.values(score).reduce((a, b) => a + b, 0),
        breakdown: score,
        metrics: { charCount, medicalTermCount, unitPatterns, tablePatterns }
    };
}

// Preprocessing methods
const PREPROCESSING_METHODS = [
    {
        name: 'High-Quality Medical',
        process: async (buffer) => sharp(buffer)
            .resize({ width: 3000, height: 3000, fit: 'inside', withoutEnlargement: false })
            .grayscale()
            .normalize()
            .linear(1.4, -40)
            .sharpen({ sigma: 1.5 })
            .threshold(120)
            .png({ compressionLevel: 6 })
            .toBuffer()
    },
    {
        name: 'Adaptive CLAHE',
        process: async (buffer) => sharp(buffer)
            .resize({ width: 3000, height: 3000, fit: 'inside' })
            .grayscale()
            .clahe({ width: 64, height: 64, maxSlope: 3 })
            .gamma(1.3)
            .sharpen({ sigma: 1 })
            .png({ compressionLevel: 6 })
            .toBuffer()
    }
];

/**
 * Main OCR extraction function
 */
async function extractTextFromImageBuffer(buffer) {
    const startTime = Date.now();

    try {
        console.log('🔍 Starting OCR extraction...');

        // Auto-rotate
        const deskewedBuffer = await deskewImage(buffer);

        // Quick scan first
        const quickBuffer = await sharp(deskewedBuffer)
            .resize({ width: 1500, height: 1500, fit: 'inside' })
            .grayscale()
            .normalize()
            .toBuffer();

        const { data: { text: quickText, confidence: quickConf } } = await Tesseract.recognize(
            quickBuffer, 'eng', {
            logger: () => { },
            tessedit_pageseg_mode: Tesseract.PSM.AUTO_ONLY
        }
        );

        const quickScore = calculateQualityScore(quickText, quickConf);
        console.log(`Quick scan: ${quickScore.total.toFixed(1)} pts`);

        // If quick scan is good, use it
        if (quickScore.total > 150 && quickScore.metrics.medicalTermCount > 3) {
            console.log(`✅ OCR quick scan successful in ${Date.now() - startTime}ms`);
            return quickText;
        }

        // Enhanced processing
        console.log('Running enhanced OCR preprocessing...');
        const processingPromises = PREPROCESSING_METHODS.slice(0, 2).map(async (method) => {
            try {
                const processedBuffer = await method.process(deskewedBuffer);

                const { data: { text, confidence } } = await Tesseract.recognize(
                    processedBuffer, 'eng', {
                    logger: (m) => {
                        if (m.status === 'recognizing text' && m.progress === 0) {
                            console.log(`OCR: ${method.name}`);
                        }
                    },
                    tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                    tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
                    preserve_interword_spaces: '1',
                    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,()-/:% <>=±μ'
                }
                );

                const score = calculateQualityScore(text, confidence);
                return { text, score, method: method.name };

            } catch (error) {
                console.error(`Method ${method.name} failed:`, error.message);
                return { text: '', score: { total: 0 }, method: method.name };
            }
        });

        const results = await Promise.all(processingPromises);
        const bestResult = results.reduce((best, current) =>
            current.score.total > best.score.total ? current : best
        );

        const elapsedTime = Date.now() - startTime;
        console.log(`✅ OCR complete: ${bestResult.method}, ${elapsedTime}ms`);

        return bestResult.text.length > 10 ? bestResult.text : ' ';

    } catch (error) {
        console.error('❌ OCR extraction error:', error);
        return ' ';
    }
}

/**
 * PDF text extraction with OCR fallback
 */
async function extractTextFromPDFBuffer(buffer) {
    try {
        const data = await pdfParse(buffer);
        console.log(`📄 PDF text extracted: ${data.text.length} chars`);

        if (data.text.trim().length > 100) {
            return data.text;
        }

        console.log('PDF appears to be scanned, using OCR...');
        return await extractTextFromImageBuffer(buffer);

    } catch (error) {
        console.error('PDF extraction error:', error);
        return ' ';
    }
}

/**
 * Main OCR extraction with parameter extraction
 */
async function extractWithOCR(fileBuffer, mimeType) {
    const startTime = Date.now();

    try {
        console.log('🔍 Starting OCR fallback extraction...');

        let extractedText = '';

        if (mimeType === 'application/pdf') {
            extractedText = await extractTextFromPDFBuffer(fileBuffer);
        } else {
            extractedText = await extractTextFromImageBuffer(fileBuffer);
        }

        const hasMinimalText = extractedText.trim().length > 0 && extractedText.trim().length < 50;
        const hasNoText = extractedText.trim().length === 0;
        const isScannedDocument = hasMinimalText || hasNoText;

        if (hasNoText) {
            extractedText = ' ';
        }

        // Extract parameters
        let healthParameters = extractedText.length > 50
            ? extractHealthParameters(extractedText)
            : [];

        const processingTime = Date.now() - startTime;
        console.log(`✅ OCR extraction complete: ${healthParameters.length} parameters in ${processingTime}ms`);

        return {
            success: healthParameters.length > 0 || isScannedDocument,
            method: 'ocr',
            extractedText: extractedText,
            healthParameters: healthParameters,
            isScannedDocument: isScannedDocument,
            requiresManualEntry: healthParameters.length === 0,
            metadata: {
                processingTime: processingTime,
                textLength: extractedText.length,
                parameterCount: healthParameters.length
            }
        };

    } catch (error) {
        console.error('❌ OCR extraction failed:', error.message);

        return {
            success: false,
            method: 'ocr',
            error: error.message,
            processingTime: Date.now() - startTime
        };
    }
}

module.exports = {
    extractWithOCR,
    extractTextFromImageBuffer,
    extractTextFromPDFBuffer
};