const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const { extractHealthParameters } = require('../utils/parameterExtractor');
const { ANALYTES } = require('../utils/labKnowledgeBase');
const pdfToImages = require('../utils/pdfToImages');

/**
 * Local OCR engine (no external APIs).
 *
 * Design:
 *  - One persistent Tesseract worker per process. The old code spawned a
 *    fresh worker (and re-loaded the language model) for EVERY recognize
 *    call - 4-6 model loads per upload. The singleton cuts OCR latency
 *    dramatically and keeps memory flat on small dynos.
 *  - All recognize calls are serialized through a promise queue, because a
 *    single worker cannot run two recognitions concurrently.
 *  - Lab reports are tables: PSM SINGLE_COLUMN (4) and SINGLE_BLOCK (6)
 *    preserve "name value unit range" line structure far better than AUTO,
 *    which loves to re-order table cells.
 */

// '+' is needed for electrolyte labels (K+, Na+); '|' is excluded - it is
// only ever a table rule and corrupts adjacent digits. Note: under LSTM the
// whitelist is advisory (the engine may ignore it), so the parser never
// relies on it - it is a hint, not a guarantee.
const CHAR_WHITELIST =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,()-/:%<>=±^+*µμ ';

let workerPromise = null;
let recognizeQueue = Promise.resolve();
let consecutiveFailures = 0;

async function getWorker() {
    if (!workerPromise) {
        workerPromise = Tesseract.createWorker('eng', Tesseract.OEM.LSTM_ONLY, {
            logger: () => { },
        });
    }
    return workerPromise;
}

/**
 * Serialized recognition through the shared worker.
 * If the worker dies, it is discarded so the next call rebuilds it.
 */
function recognizeWith(buffer, params = {}) {
    const run = recognizeQueue.then(async () => {
        try {
            const worker = await getWorker();
            await worker.setParameters({
                preserve_interword_spaces: '1',
                tessedit_char_whitelist: CHAR_WHITELIST,
                tessedit_pageseg_mode: Tesseract.PSM.SINGLE_COLUMN,
                ...params,
            });
            const { data } = await worker.recognize(buffer);
            consecutiveFailures = 0;
            return data;
        } catch (error) {
            // A single failure is usually a bad input buffer, not a dead
            // worker - keep the (expensive) worker alive. Two consecutive
            // failures suggest real corruption: rebuild on the next call.
            consecutiveFailures++;
            if (consecutiveFailures >= 2) {
                try { (await workerPromise).terminate(); } catch (_) { /* ignore */ }
                workerPromise = null;
                consecutiveFailures = 0;
            }
            throw error;
        }
    });
    recognizeQueue = run.catch(() => { });
    return run;
}

// Auto-rotate detection: probe rotations on a small copy (fast), apply the
// winning rotation to the full-size image.
async function deskewImage(buffer) {
    try {
        const probe = await sharp(buffer)
            .resize({ width: 1200, height: 1200, fit: 'inside' })
            .grayscale()
            .toBuffer();

        const { text } = await recognizeWith(probe, {
            tessedit_pageseg_mode: Tesseract.PSM.AUTO_ONLY,
        });

        if (text.length < 50) {
            let bestRotation = 0;
            let bestLength = text.length;

            for (const angle of [90, 180, 270]) {
                const rotated = await sharp(probe).rotate(angle).toBuffer();
                const { text: rotatedText } = await recognizeWith(rotated, {
                    tessedit_pageseg_mode: Tesseract.PSM.AUTO_ONLY,
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

// Quality scoring - how much lab-report signal did a pass produce?
// One representative (longest) alias per analyte, ALL analytes, and each
// analyte counts at most once - so a thyroid panel scores as well as a lipid
// panel and near-duplicate aliases cannot inflate one analyte's weight.
const SCORING_GROUPS = ANALYTES.map(a =>
    a.aliases.filter(al => al.length >= 3).sort((x, y) => y.length - x.length)
).filter(g => g.length > 0);

function calculateQualityScore(text, confidence) {
    const lower = text.toLowerCase();
    const charCount = text.length;
    const medicalTermCount = SCORING_GROUPS.filter(group =>
        group.some(term => lower.includes(term))
    ).length;
    const unitPatterns = (text.match(/\d+\.?\d*\s*(mg\/dl|mmol\/l|g\/dl|u\/l|ng\/ml|pg\/ml|meq\/l|fl|%)/gi) || []).length;
    const tablePatterns = (text.match(/\w+\s*[:\-]?\s+\d+\.?\d*/g) || []).length;

    const score = {
        content: charCount > 100 ? 50 : charCount * 0.3,
        structure: Math.min(tablePatterns * 4, 80),
        medicalContent: Math.min(medicalTermCount * 12, 180),
        units: Math.min(unitPatterns * 10, 120),
        confidence: (confidence || 0) * 0.4
    };

    return {
        total: Object.values(score).reduce((a, b) => a + b, 0),
        breakdown: score,
        metrics: { charCount, medicalTermCount, unitPatterns, tablePatterns }
    };
}

// Preprocessing variants - each paired with the page-segmentation mode that
// suits it. Hard binarization (threshold) was removed: it destroys faint
// scans; normalize + CLAHE handle contrast without data loss.
const OCR_PASSES = [
    {
        name: 'High-Res Linear',
        psm: () => Tesseract.PSM.SINGLE_COLUMN,
        process: async (buffer) => sharp(buffer)
            .resize({ width: 2600, height: 2600, fit: 'inside', withoutEnlargement: false })
            .grayscale()
            .normalize()
            .linear(1.3, -25)
            .sharpen({ sigma: 1.2 })
            .png({ compressionLevel: 4 })
            .toBuffer()
    },
    {
        name: 'Adaptive CLAHE',
        psm: () => Tesseract.PSM.SINGLE_BLOCK,
        process: async (buffer) => sharp(buffer)
            .resize({ width: 2600, height: 2600, fit: 'inside' })
            .grayscale()
            .clahe({ width: 64, height: 64, maxSlope: 3 })
            .gamma(1.2)
            .sharpen({ sigma: 1 })
            .png({ compressionLevel: 4 })
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

        const deskewedBuffer = await deskewImage(buffer);

        // Quick pass: moderate resolution, column-preserving segmentation
        const quickBuffer = await sharp(deskewedBuffer)
            .resize({ width: 1600, height: 1600, fit: 'inside' })
            .grayscale()
            .normalize()
            .toBuffer();

        const quick = await recognizeWith(quickBuffer, {
            tessedit_pageseg_mode: Tesseract.PSM.SINGLE_COLUMN,
        });

        const quickScore = calculateQualityScore(quick.text, quick.confidence);
        console.log(`Quick scan: ${quickScore.total.toFixed(1)} pts`);

        if (quickScore.total > 180 && quickScore.metrics.medicalTermCount > 3) {
            console.log(`✅ OCR quick scan successful in ${Date.now() - startTime}ms`);
            return quick.text;
        }

        // Enhanced passes - sequential (single shared worker), best score wins.
        // The quick result stays in the running so we never regress.
        let best = { text: quick.text, score: quickScore, method: 'Quick' };

        for (const pass of OCR_PASSES) {
            try {
                console.log(`OCR pass: ${pass.name}`);
                const processed = await pass.process(deskewedBuffer);
                const { text, confidence } = await recognizeWith(processed, {
                    tessedit_pageseg_mode: pass.psm(),
                });
                const score = calculateQualityScore(text, confidence);
                if (score.total > best.score.total) {
                    best = { text, score, method: pass.name };
                }
            } catch (error) {
                console.error(`Pass ${pass.name} failed:`, error.message);
            }
        }

        console.log(`✅ OCR complete: ${best.method}, ${Date.now() - startTime}ms`);
        return best.text.length > 10 ? best.text : ' ';

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
        // Digital PDFs carry a text layer - extracting it is instant and
        // 100% accurate, so OCR is only for scanned documents.
        const data = await pdfParse(buffer);
        console.log(`📄 PDF text extracted: ${data.text.length} chars`);
        if (data.text.trim().length > 100) {
            return data.text;
        }

        console.log('PDF appears to be scanned, using OCR on each page...');
        let ocrText = '';
        try {
            const imageBuffers = await pdfToImages(buffer);
            for (let i = 0; i < imageBuffers.length; i++) {
                try {
                    const pageText = await extractTextFromImageBuffer(imageBuffers[i]);
                    ocrText += `\n--- Page ${i + 1} ---\n` + pageText;
                } catch (ocrErr) {
                    ocrText += `\n--- Page ${i + 1} OCR failed: ${ocrErr.message} ---\n`;
                }
            }
        } catch (imgErr) {
            console.error('PDF to image conversion failed:', imgErr.message);
            throw new Error('Failed to convert PDF pages to images for OCR.');
        }
        if (ocrText.trim().length > 0) {
            return ocrText;
        } else {
            throw new Error('No text could be extracted from PDF via OCR.');
        }
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
        console.log('🔍 Starting local extraction (no external API)...');

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
        console.log(`✅ Local extraction complete: ${healthParameters.length} parameters in ${processingTime}ms`);

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
        console.error('❌ Local extraction failed:', error.message);

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
