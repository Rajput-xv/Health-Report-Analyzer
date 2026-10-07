/*
 * @fileoverview Local lab-report extraction engine (no external APIs).
 *
 * Pipeline per report:
 *   1. normalize   - fix OCR character confusions, strip table pipes, unify
 *                    dashes/commas, rewrite verbal ranges ("Upto 40" -> "<40")
 *   2. match       - find the analyte on each line via hard word-boundary
 *                    alias regexes (longest alias wins, so "MCHC" is never
 *                    captured by "MCH" and "fasting" never triggers "AST")
 *   3. tokenize    - split the rest of the line into value / unit / range;
 *                    units may precede the value ("WBC (x10^3/uL) 7.2");
 *                    a wrapped value line is joined only when the header
 *                    line names exactly ONE analyte (panel headers like
 *                    "T3  T4  TSH" are skipped rather than misattributed)
 *   4. validate    - reject tokens glued to words ("25-Hydroxy", "B12"),
 *                    values outside per-analyte plausibility bounds (dates,
 *                    sample IDs), re-route percent vs absolute differential
 *                    counts by magnitude BEFORE any repair is considered
 *   5. repair      - decimal-loss repair ("11.4" OCR'd as "114") only when
 *                    a printed reference range on the same line corroborates
 *                    the repaired magnitude; otherwise the token is dropped.
 *                    Missing a value is safe; inventing one is not.
 *   6. grade       - status from the report's own printed range, an explicit
 *                    H/L flag, or the knowledge-base fallback range
 */

const { ANALYTES, UNIT_LEXICON } = require('./labKnowledgeBase');

const BY_KEY = new Map(ANALYTES.map(a => [a.key, a]));

// ---------------------------------------------------------------------------
// Alias index: compiled once, longest alias first.
// ---------------------------------------------------------------------------
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ALIAS_INDEX = [];
for (const analyte of ANALYTES) {
  for (const alias of analyte.aliases) {
    const body = escapeRegex(alias).replace(/\\? +/g, '[\\s.,\\-:]*');
    ALIAS_INDEX.push({
      analyte,
      alias,
      length: alias.length,
      re: new RegExp(`(?<![a-z0-9])(?:${body})(?![a-z0-9])`, 'i'),
    });
  }
}
ALIAS_INDEX.sort((a, b) => b.length - a.length);

// ---------------------------------------------------------------------------
// Text normalization
// ---------------------------------------------------------------------------
function normalizeText(text) {
  let t = text
    .replace(/\r/g, '')
    .replace(/[»›]/g, '>')
    .replace(/[«‹]/g, '<')
    .replace(/[–—−]/g, '-')          // en/em dash, minus sign -> hyphen
    .replace(/[·•]/g, '.')
    .replace(/≤/g, '<')
    .replace(/≥/g, '>')
    .replace(/\|/g, ' ')             // table rules; never part of a value
    .replace(/ /g, ' ');

  // Common OCR word-level fixes seen on real reports
  t = t
    .replace(/mg\/ol\b/gi, 'mg/dL')
    .replace(/mg\/di\b/gi, 'mg/dL')
    .replace(/Trglycendeos|Triglycendes|Trig[il]ycerides/gi, 'Triglycerides')
    .replace(/Leu ?[o0]cyte/gi, 'Leukocyte')
    .replace(/Ha?emog[lt1][o0]bin/gi, 'Hemoglobin')
    .replace(/Chol?esterol/gi, 'Cholesterol')
    .replace(/Crea[tl][i1]nine/gi, 'Creatinine')
    .replace(/Caiculatea|Calcuiated/gi, 'Calculated');

  // Verbal one-sided ranges -> symbolic, so a single range parser handles all
  t = t
    .replace(/\b(?:up\s*to|upto|less\s+than|below|not\s+more\s+than|max(?:imum)?\.?)\s*:?\s*(?=\d)/gi, '<')
    .replace(/\b(?:above|more\s+than|greater\s+than|over|min(?:imum)?\.?)\s*:?\s*(?=\d)/gi, '>');

  return t;
}

// Fix digit-lookalike OCR errors inside numeric tokens only ("l2.5" -> "12.5")
function fixNumericToken(tok) {
  if (!/\d/.test(tok)) return tok;
  return tok.replace(/[OoIl]/g, ch => (ch === 'O' || ch === 'o' ? '0' : '1'));
}

// Strip thousands separators: "1,23,000" (Indian) and "123,000" -> plain digits
function stripNumberCommas(line) {
  return line.replace(/(\d),(?=\d{2,3}\b|\d{2,3},)/g, '$1');
}

// ---------------------------------------------------------------------------
// Range / value / unit tokenizers
// ---------------------------------------------------------------------------
const RANGE_BETWEEN = /(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)/i;
const RANGE_LT = /<\s*=?\s*(\d+(?:\.\d+)?)/;
const RANGE_GT = />\s*=?\s*(\d+(?:\.\d+)?)/;

function findRange(text) {
  const between = text.match(RANGE_BETWEEN);
  if (between) {
    const low = parseFloat(between[1]);
    const high = parseFloat(between[2]);
    if (!isNaN(low) && !isNaN(high) && high > low) {
      return { low, high, text: `${between[1]} - ${between[2]}`, index: between.index, raw: between[0] };
    }
  }
  const lt = text.match(RANGE_LT);
  if (lt) return { low: null, high: parseFloat(lt[1]), text: `< ${lt[1]}`, index: lt.index, raw: lt[0] };
  const gt = text.match(RANGE_GT);
  if (gt) return { low: parseFloat(gt[1]), high: null, text: `> ${gt[1]}`, index: gt.index, raw: gt[0] };
  return null;
}

// Unit directly AFTER a value ("118 mg/dL")
function findUnit(text, fromIndex) {
  const slice = text.slice(fromIndex, fromIndex + 24).trimStart();
  for (const entry of UNIT_LEXICON) {
    const m = slice.match(entry.re);
    if (m && m.index === 0) {
      return { canon: entry.canon, scale: entry.scale, length: m[0].length };
    }
  }
  return null;
}

// Unit ANYWHERE in a text span - for header-style layouts where the unit
// precedes the value: "WBC (x10^3/uL)  7.2"
function findUnitLoose(text) {
  for (const entry of UNIT_LEXICON) {
    if (entry.re.test(text)) return { canon: entry.canon, scale: entry.scale };
  }
  return null;
}

function numericTokens(text) {
  const tokens = [];
  const re = /[\dOoIl]*\d[\dOoIl]*(?:\.\d+)?/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const fixed = fixNumericToken(m[0]);
    const value = parseFloat(fixed);
    if (!isNaN(value)) {
      tokens.push({ value, raw: fixed, index: m.index, end: m.index + m[0].length });
    }
  }
  return tokens;
}

// A token glued to a word is part of a name ("25-Hydroxy", "B12", "x10^3"),
// not a result - unless what follows is a recognized unit ("118mg/dL").
function isWordAttached(text, tok) {
  const before = text[tok.index - 1];
  if (before && /[A-Za-z^_]/.test(before)) return true;
  const after = text.slice(tok.end, tok.end + 10);
  if (/^[-/]?[A-Za-z]{3,}/.test(after) && !findUnit(text, tok.end)) return true;
  return false;
}

function fits(value, sanity) {
  return value >= sanity.min && value <= sanity.max;
}

// ---------------------------------------------------------------------------
// Knowledge-base-guided repair of printed range bounds. A bound is
// "credible" when it sits within 3x of the KB prior; dividing by 10/100 is
// only accepted when the raw bound is NOT credible and the shifted one is
// ("06 - 13" for creatinine -> 0.6 - 1.3). Genuine lab ranges that merely
// differ from the KB (70-110 vs 70-99) are credible as printed and untouched.
// ---------------------------------------------------------------------------
function credible(value, anchor) {
  if (anchor === null || anchor === undefined) return true;
  if (anchor === 0) return value <= 2;
  return value >= anchor / 3 && value <= anchor * 3;
}

function repairRangeBound(raw, kbBound) {
  if (raw === null || kbBound === null || kbBound === undefined) return raw;
  if (credible(raw, kbBound)) return raw;
  for (const d of [10, 100]) {
    if (credible(raw / d, kbBound)) return raw / d;
  }
  return raw;
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------
function statusFromBounds(value, low, high) {
  if (low !== null && low !== undefined && value < low) return 'Low';
  if (high !== null && high !== undefined && value > high) return 'High';
  return 'Normal';
}

function formatKbRange(analyte) {
  const { low, high } = analyte.range;
  if (low !== null && high !== null) return `${low} - ${high}`;
  if (high !== null) return `< ${high}`;
  if (low !== null) return `> ${low}`;
  return 'N/A';
}

// ---------------------------------------------------------------------------
// Per-line extraction
// ---------------------------------------------------------------------------
const SERUM_PREFIX = /^(?:s\.|sr\.?|serum|plasma|blood|whole blood)\s+/i;

function matchAnalyte(line) {
  for (const entry of ALIAS_INDEX) {
    const m = line.match(entry.re);
    if (m) return { analyte: entry.analyte, index: m.index, matched: m[0] };
  }
  return null;
}

// How many DISTINCT analytes does this line name? Matched spans are consumed
// so overlapping aliases of one analyte ("ldl cholesterol" + "cholesterol")
// count once, while a panel header "T3  T4  TSH" counts three.
function countDistinctAnalytes(line) {
  let text = line;
  const keys = new Set();
  for (let i = 0; i < 6; i++) {
    const hit = matchAnalyte(text);
    if (!hit) break;
    keys.add(hit.analyte.key);
    text = text.slice(0, hit.index) + ' '.repeat(hit.matched.length) + text.slice(hit.index + hit.matched.length);
  }
  return keys.size;
}

function selectValue(rest, analyteIn, range) {
  const tokens = numericTokens(rest).filter(tok =>
    !range || tok.index < range.index || tok.index >= range.index + range.raw.length
  );

  let analyte = analyteIn;

  // Pass 1: raw plausibility, with percent<->absolute reroute BEFORE repair
  for (const tok of tokens) {
    if (isWordAttached(rest, tok)) continue;

    const unitHit = findUnit(rest, tok.end) || findUnitLoose(rest.slice(0, tok.index));
    let value = tok.value;
    if (unitHit && unitHit.scale !== 1 && analyte.scale) value *= unitHit.scale;

    if (fits(value, analyte.sanity)) {
      return { analyte, chosen: { ...tok, value }, unit: unitHit };
    }

    if (analyte.siblingAbs) {
      const sib = BY_KEY.get(analyte.siblingAbs);
      const sv = tok.value * (unitHit && sib.scale ? unitHit.scale : 1);
      if (sv > 100 && fits(sv, sib.sanity)) {
        return { analyte: sib, chosen: { ...tok, value: sv }, unit: unitHit };
      }
    }
  }

  // Pass 2: decimal-loss repair, ONLY corroborated by a printed range on the
  // same line ("Hemoglobin 114 g/dL 13.0 - 17.0" -> 11.4). Without that
  // corroboration the token is dropped - no value is better than a wrong one.
  if (range) {
    const lo = range.low;
    const hi = range.high;
    const floor = (lo !== null ? lo : hi) / 3;
    const ceil = (hi !== null ? hi : lo) * 3;
    for (const tok of tokens) {
      if (isWordAttached(rest, tok)) continue;
      if (/\./.test(tok.raw) || tok.value < 100) continue;
      for (const d of [10, 100]) {
        const v = tok.value / d;
        if (fits(v, analyte.sanity) && v >= floor && v <= ceil) {
          return { analyte, chosen: { ...tok, value: v }, unit: findUnit(rest, tok.end) };
        }
      }
    }
  }

  return null;
}

function extractFromLine(line, nextLine) {
  const cleanLine = stripNumberCommas(line.replace(SERUM_PREFIX, ''));
  const hit = matchAnalyte(cleanLine);
  if (!hit) return null;

  let rest = cleanLine.slice(hit.index + hit.matched.length).replace(/^[\s:.\-]+/, '');

  // Column wrap: name line + values line. Only safe when this line names
  // exactly one analyte; panel headers ("T3  T4  TSH") are skipped entirely.
  if (!/\d/.test(rest) && nextLine && /\d/.test(nextLine)) {
    if (countDistinctAnalytes(cleanLine) > 1) return null;
    rest = stripNumberCommas(nextLine.trim());
  }
  if (!/\d/.test(rest)) return null;

  const range = findRange(rest);
  const selection = selectValue(rest, hit.analyte, range);
  if (!selection) return null;

  const { analyte, chosen, unit } = selection;

  // Explicit H/L flag straight after the value ("5.9 H", "132 L")
  const afterValue = rest.slice(chosen.end, chosen.end + 12);
  const flag = afterValue.match(/^\s*(?:\*\s*)?(H|L)(?![a-zA-Z])/);

  // Printed range: scale count-style ranges to match a scaled value, repair
  // decimal-lost bounds against the KB prior, and reject implausible leftovers
  // (a date "12-04" next to glucose must not become its range).
  let printedRange = null;
  if (range) {
    const scaleForRange =
      analyte.scale && unit && unit.scale !== 1 &&
      (range.high !== null ? range.high : range.low) < analyte.sanity.min
        ? unit.scale : 1;
    let lo = range.low === null ? null : range.low * scaleForRange;
    let hi = range.high === null ? null : range.high * scaleForRange;

    const rLo = repairRangeBound(lo, analyte.range.low);
    const rHi = repairRangeBound(hi, analyte.range.high);
    const repaired = rLo !== lo || rHi !== hi;
    if (rLo === null || rHi === null || rLo < rHi) {
      lo = rLo;
      hi = rHi;
    }

    const plausible = [lo, hi].every(v =>
      v === null || (v >= analyte.sanity.min / 10 && v <= analyte.sanity.max)
    );
    if (plausible) {
      let text;
      if (scaleForRange === 1 && !repaired) text = range.text;
      else if (lo !== null && hi !== null) text = `${lo} - ${hi}`;
      else if (hi !== null) text = `< ${hi}`;
      else text = `> ${lo}`;

      printedRange = { low: lo, high: hi, text };
    }
  }

  let status;
  let normalRange;
  let bounds;
  if (printedRange) {
    status = statusFromBounds(chosen.value, printedRange.low, printedRange.high);
    normalRange = printedRange.text;
    bounds = { low: printedRange.low, high: printedRange.high };
  } else if (flag) {
    status = flag[1] === 'H' ? 'High' : 'Low';
    normalRange = formatKbRange(analyte);
    bounds = { low: analyte.range.low, high: analyte.range.high };
  } else if (analyte.range.low !== null || analyte.range.high !== null) {
    status = statusFromBounds(chosen.value, analyte.range.low, analyte.range.high);
    normalRange = formatKbRange(analyte);
    bounds = { low: analyte.range.low, high: analyte.range.high };
  } else {
    status = 'Unknown';
    normalRange = 'N/A';
    bounds = { low: null, high: null };
  }

  return {
    key: analyte.key,
    quality: (printedRange ? 2 : 0) + (unit ? 1 : 0),
    parameter: {
      name: analyte.name,
      value: chosen.value,
      unit: unit ? unit.canon : analyte.unit,
      normalRange,
      status,
      category: analyte.category,
      parameterType: 'numeric',
      textValue: null,
      // Numeric bounds for the insights engine (not persisted by the schema)
      rangeLow: bounds.low,
      rangeHigh: bounds.high,
    },
  };
}

// ---------------------------------------------------------------------------
// Entry point (same export signature as before)
// ---------------------------------------------------------------------------
function extractHealthParameters(text) {
  if (!text || text.trim().length === 0) return [];

  const lines = normalizeText(text)
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 1);

  const found = new Map(); // key -> { quality, parameter }

  for (let i = 0; i < lines.length; i++) {
    const result = extractFromLine(lines[i], lines[i + 1]);
    if (!result) continue;

    const existing = found.get(result.key);
    if (!existing || result.quality > existing.quality) {
      found.set(result.key, result);
    }
  }

  return Array.from(found.values()).map(r => r.parameter);
}

module.exports = { extractHealthParameters };
