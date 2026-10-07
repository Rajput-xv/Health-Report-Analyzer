/*
 * @fileoverview This file contains the logic for extracting health parameters from text.
 * It uses a robust, multi-stage process involving text cleaning and regex matching
 * to achieve high accuracy with a wide range of lab report formats.
 */

/**
 * Pre-processes the raw OCR text to correct common errors and normalize the content.
 * This is a critical step for improving the accuracy of the extraction logic.
 * @param {string} text The raw text from OCR.
 * @returns {string} The cleaned and normalized text.
 */
function cleanOcrText(text) {
  return text
    .replace(/»/g, '>') // Corrects OCR errors where > is read as »
    .replace(/mg\/ol\./gi, 'mg/dL') // Corrects unit misspellings
    .replace(/Cholesterol\. Total/gi, 'Cholesterol, Total') // Normalizes parameter names
    .replace(/Trglycendeos/gi, 'Triglycerides') // Corrects common OCR misspellings
    .replace(/Leu ocyte/gi, 'Leukocyte') // Fixes spacing errors in names
    .replace(/Caiculatea/gi, 'Calculated'); // Fix common OCR error
  // Note: removed a "42 20" -> "42.20" replacement that was corrupting lines like
  // "Glucose 110 70-99" (turned value 110 into 110.70). The regex below handles it.
}

// A comprehensive list of health parameters with flexible matching patterns.
const HEALTH_PARAMETERS = [
  // Lipid Panel
  { name: 'Total Cholesterol', patterns: [/total cholesterol/i, /cholesterol, total/i] },
  { name: 'HDL Cholesterol', patterns: [/hdl cholesterol/i, /\bhdl-c\b/i] },
  { name: 'LDL Cholesterol', patterns: [/ldl cholesterol/i, /\bldl-c\b/i, /ldl cholesterol, calculated/i] },
  { name: 'VLDL Cholesterol', patterns: [/vldl cholesterol/i, /vldl cholesterol, calculated/i] },
  { name: 'Non-HDL Cholesterol', patterns: [/non-hdl cholesterol/i] },
  { name: 'Triglycerides', patterns: [/triglycerides/i] },

  // Glucose
  { name: 'Glucose', patterns: [/glucose/i, /blood sugar/i] },
  { name: 'Hemoglobin A1c', patterns: [/hemoglobin a1c/i, /hba1c/i] },

  // Complete Blood Count (CBC)
  { name: 'White Blood Cell Count', patterns: [/white blood cell count/i, /\bwbc\b/i, /leukocyte count/i] },
  { name: 'Red Blood Cell Count', patterns: [/red blood cell count/i, /\brbc\b/i] },
  { name: 'Hemoglobin', patterns: [/hemoglobin/i, /\bhgb\b/i] },
  { name: 'Hematocrit', patterns: [/hematocrit/i, /\bhct\b/i] },
  { name: 'Platelet Count', patterns: [/platelet count/i, /\bplt\b/i] },
  { name: 'MCV', patterns: [/\bmcv\b/i, /mean corpuscular volume/i] },
  { name: 'MCH', patterns: [/\bmch\b/i, /mean corpuscular hemoglobin/i] },
  { name: 'MCHC', patterns: [/\bmchc\b/i, /mean corpuscular hemoglobin concentration/i] },
  { name: 'RDW', patterns: [/\brdw\b/i, /red cell distribution width/i] },
  { name: 'Neutrophils', patterns: [/neutrophils/i, /\bneut\b/i] },
  { name: 'Lymphocytes', patterns: [/lymphocytes/i, /\blymph\b/i] },
  { name: 'Monocytes', patterns: [/monocytes/i, /\bmono\b/i] },
  { name: 'Eosinophils', patterns: [/eosinophils/i, /\beos\b/i] },
  { name: 'Basophils', patterns: [/basophils/i, /\bbaso\b/i] },
  { name: 'Absolute Neutrophils', patterns: [/absolute neutrophils/i, /\banc\b/i] },
  { name: 'Absolute Lymphocytes', patterns: [/absolute lymphocytes/i, /\balc\b/i] },
  { name: 'Absolute Monocytes', patterns: [/absolute monocytes/i] },
  { name: 'Absolute Eosinophils', patterns: [/absolute eosinophils/i] },
  { name: 'Absolute Basophils', patterns: [/absolute basophils/i] },

  // Comprehensive Metabolic Panel (CMP)
  { name: 'Sodium', patterns: [/sodium/i] },
  { name: 'Potassium', patterns: [/potassium/i] },
  { name: 'Chloride', patterns: [/chloride/i] },
  { name: 'Bicarbonate', patterns: [/bicarbonate/i, /\bco2\b/i] },
  { name: 'BUN', patterns: [/\bbun\b/i, /blood urea nitrogen/i] },
  { name: 'Creatinine', patterns: [/creatinine/i] },
  { name: 'Calcium', patterns: [/calcium/i] },
  { name: 'Total Protein', patterns: [/total protein/i] },
  { name: 'Albumin', patterns: [/albumin/i] },
  { name: 'AST', patterns: [/\bast\b/i, /aspartate aminotransferase/i] },
  { name: 'ALT', patterns: [/\balt\b/i, /alanine aminotransferase/i] },
  { name: 'Alkaline Phosphatase', patterns: [/alkaline phosphatase/i, /\balp\b/i] },
];

// Regex to find a numeric value, a unit, and a reference range.
// It captures the first number as the value, an optional unit, and the rest as the range.
const EXTRACTION_REGEX = new RegExp(
  // Value: captures floating point or integer numbers
  '([\\d\\.]+)\\s*' +
  // Unit: captures common units, allows for flexible characters
  '([a-zA-Z%^/\\d\\.\\-]*[a-zA-Z%])?\\s*' +
  // Range: captures various range formats (e.g., '70-100', '<100', '>40')
  '([<>\\d\\.\\s-]+)?'
);

/**
 * Determines if a given value is outside the normal range.
 * @param {number} value The parameter's value.
 * @param {string} range The normal range (e.g., '70-100', '<100', '>40').
 * @returns {string} The status ('Normal', 'High', 'Low', 'Unknown').
 */
function getStatus(value, range) {
  if (!range || isNaN(value)) return 'Unknown';

  const cleanedRange = range.replace(/,/g, '').trim();

  if (cleanedRange.startsWith('<')) {
    const max = parseFloat(cleanedRange.substring(1));
    if (isNaN(max)) return 'Unknown';
    return value >= max ? 'High' : 'Normal';
  } else if (cleanedRange.startsWith('>')) {
    const min = parseFloat(cleanedRange.substring(1));
    if (isNaN(min)) return 'Unknown';
    return value <= min ? 'Low' : 'Normal';
  } else if (cleanedRange.includes('-')) {
    const [min, max] = cleanedRange.split('-').map(s => parseFloat(s.trim()));
    if (isNaN(min) || isNaN(max)) return 'Unknown';
    if (value < min) return 'Low';
    if (value > max) return 'High';
    return 'Normal';
  }
  return 'Unknown';
}

/**
 * Extracts health parameters from a block of text using a more generalized approach.
 * @param {string} text The text extracted from a lab report.
 * @returns {Array<Object>} A list of extracted health parameters.
 */
function extractHealthParameters(text) {
  const cleanedText = cleanOcrText(text);
  const lines = cleanedText.split('\n');
  const extracted = new Map(); // Use a map to avoid duplicate parameter entries

  for (const line of lines) {
    // Match the longest name on the line so e.g. "MCHC" isn't grabbed by "MCH",
    // or "Absolute Neutrophils" by "Neutrophils".
    let best = null; // { param, match }
    for (const param of HEALTH_PARAMETERS) {
      // Skip if parameter has already been found
      if (extracted.has(param.name)) continue;

      for (const pattern of param.patterns) {
        const match = line.match(pattern);
        if (match && (!best || match[0].length > best.match[0].length)) {
          best = { param, match };
        }
      }
    }

    if (!best) continue;

    const { param, match } = best;
    // Remove the matched parameter name to isolate the values
    const restOfLine = line.substring(match.index + match[0].length).trim();

    // Use a more robust regex to find value, unit, and range
    const valueMatch = restOfLine.match(EXTRACTION_REGEX);

    if (valueMatch && valueMatch[1]) {
      const value = parseFloat(valueMatch[1]);
      const unit = valueMatch[2] ? valueMatch[2].trim() : 'Unknown';
      const normalRange = valueMatch[3] ? valueMatch[3].trim() : 'Unknown';

      if (!isNaN(value)) {
        extracted.set(param.name, {
          name: param.name,
          value: value,
          unit: unit,
          normalRange: normalRange,
          status: getStatus(value, normalRange),
          category: 'Lab Result',
          parameterType: 'numeric', // Required per schema - OCR extracts numeric lab values
          textValue: null // For categorical values - not applicable for numeric OCR extractions
        });
      }
    }
  }

  return Array.from(extracted.values());
}

module.exports = { extractHealthParameters };
