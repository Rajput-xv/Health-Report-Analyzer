/*
 * @fileoverview Local insights engine - generates the same aiInsights shape
 * the Gemini path produces, entirely from the lab knowledge base. No API.
 *
 * Severity is graded by how far the value sits outside its range:
 *   within 20% of the boundary -> Mild, 20-50% -> Moderate, beyond -> Severe.
 */

const { ANALYTES, CATEGORY_ADVICE } = require('../utils/labKnowledgeBase');

const BY_NAME = new Map(ANALYTES.map(a => [a.name, a]));

// Fallback only: parameters coming from this repo's extractor carry numeric
// rangeLow/rangeHigh, so the text is never re-parsed for them. This keeps
// working for parameters from other sources (manual entry, Gemini).
function parseRange(rangeText) {
  if (!rangeText || rangeText === 'N/A' || rangeText === 'Unknown') return null;
  const between = rangeText.match(/(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)/i);
  if (between) return { low: parseFloat(between[1]), high: parseFloat(between[2]) };
  const lt = rangeText.match(/<\s*(\d+(?:\.\d+)?)/);
  if (lt) return { low: null, high: parseFloat(lt[1]) };
  const gt = rangeText.match(/>\s*(\d+(?:\.\d+)?)/);
  if (gt) return { low: parseFloat(gt[1]), high: null };
  return null;
}

function boundsOf(param) {
  if (typeof param.rangeLow === 'number' || typeof param.rangeHigh === 'number') {
    return {
      low: typeof param.rangeLow === 'number' ? param.rangeLow : null,
      high: typeof param.rangeHigh === 'number' ? param.rangeHigh : null,
    };
  }
  return parseRange(param.normalRange);
}

function gradeSeverity(value, range) {
  if (!range || typeof value !== 'number' || isNaN(value)) return 'Unknown';

  let boundary = null;
  if (range.high !== null && value > range.high) boundary = range.high;
  else if (range.low !== null && value < range.low) boundary = range.low;
  if (boundary === null || boundary === 0) return 'Mild';

  const deviation = Math.abs(value - boundary) / Math.abs(boundary);
  if (deviation < 0.2) return 'Mild';
  if (deviation < 0.5) return 'Moderate';
  return 'Severe';
}

function concernFor(param) {
  const kb = BY_NAME.get(param.name);
  const direction = param.status === 'High' ? 'high' : 'low';
  const note = kb && kb.notes && kb.notes[direction];
  if (note) return `${param.name} ${note}`;
  return `${param.name} is ${direction} at ${param.value} ${param.unit || ''} (reference: ${param.normalRange}).`.trim();
}

function recommendationFor(param) {
  const kb = BY_NAME.get(param.name);
  const advice = kb ? CATEGORY_ADVICE[kb.category] : null;
  return advice || 'Discuss this result with your healthcare provider.';
}

/**
 * Build insights from extracted parameters. Matches the aiInsights schema:
 * { summary, outliers[], recommendations[], riskLevel, positiveFindings[] }
 */
function generateInsights(healthParameters) {
  const params = Array.isArray(healthParameters) ? healthParameters : [];
  const outliers = params.filter(p => p.status === 'High' || p.status === 'Low');
  const normals = params.filter(p => p.status === 'Normal');

  const gradedOutliers = outliers.map(p => ({
    parameter: p.name,
    value: p.value,
    normalRange: p.normalRange || '',
    severity: gradeSeverity(p.value, boundsOf(p)),
    concern: concernFor(p),
    recommendation: recommendationFor(p),
  }));

  // Risk level: any Severe -> High, any Moderate or 3+ outliers -> Moderate
  const severities = gradedOutliers.map(o => o.severity);
  let riskLevel = 'Low';
  if (severities.includes('Severe')) riskLevel = 'High';
  else if (severities.includes('Moderate') || gradedOutliers.length >= 3) riskLevel = 'Moderate';

  // One recommendation per affected category, deduplicated, most severe first
  const severityRank = { Severe: 0, Moderate: 1, Mild: 2, Unknown: 3 };
  const recommendations = [...new Set(
    gradedOutliers
      .slice()
      .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
      .map(o => o.recommendation)
  )];
  if (recommendations.length === 0 && params.length > 0) {
    recommendations.push('All measured parameters are within their reference ranges - keep up your current habits.');
  }
  if (gradedOutliers.length > 0) {
    recommendations.push('These are automated observations, not a diagnosis - please review the full report with your doctor.');
  }

  const summary = gradedOutliers.length > 0
    ? `${params.length} parameter(s) analyzed; ${gradedOutliers.length} outside reference range: ${gradedOutliers.map(o => o.parameter).join(', ')}.`
    : params.length > 0
      ? `${params.length} parameter(s) analyzed; all within reference ranges.`
      : 'No measurable parameters were detected in this report.';

  return {
    summary,
    outliers: gradedOutliers,
    recommendations,
    riskLevel,
    positiveFindings: normals.slice(0, 12).map(p => `${p.name} is within normal range (${p.value} ${p.unit || ''})`.trim()),
  };
}

module.exports = { generateInsights };
