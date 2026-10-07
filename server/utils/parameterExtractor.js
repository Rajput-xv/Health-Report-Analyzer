/*
 * @fileoverview Local lab-report extraction engine (no external APIs).
 *
 * Pipeline per report:
 *   1. normalize   - fix OCR character confusions, unify dashes/commas,
 *                    rewrite verbal ranges ("Upto 40" -> "<40")
 *   2. match       - find the analyte on each line via hard word-boundary
 *                    alias regexes (longest alias wins, so "MCHC" is never
 *                    captured by "MCH" and "fasting" never triggers "AST")
 *   3. tokenize    - split the rest of the line into value / unit / range,
 *                    joining the next line when a report wraps columns
 *   4. validate    - reject values outside per-analyte plausibility bounds
 *                    (kills dates, sample IDs and phone numbers), re-route
 *                    percent vs absolute differential counts by magnitude
 *   5. grade       - compute status from the report's own printed range,
 *                    an explicit H/L flag, or the knowledge-base fallback
 *
 * Exports the same signature the rest of the server already uses.
 */

const { ANALYTES, UNIT_LEXICON } = require('./labKnowledgeBase');

const BY_KEY = new Map(ANALYTES.map(a => [a.key, a]));

// ---------------------------------------------------------------------------
// 1. Alias index: compiled once, longest alias first.
//    Boundary = "not adjacent to a letter or digit", which is stricter than
//    \b for tokens like "a/g ratio" or "lp(a)".
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
// 2. Text normalization
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
    .replace(/ /g, ' ');

  // Common OCR word-level fixes seen on real reports
  t = t
    .replace(/mg\/ol\b/gi, 'mg/dL')
    .replace(/mg\/di\b/gi, 'mg/dL')
    .replace(/Trglycendeos|Triglycendes|Trig[il]ycerides/gi, 'Triglycerides')
    .replace(/Leu ?[o0]cyte/gi, 'Leukocyte')
    .replace(/Ha?emog[lt1|][o0]bin/gi, 'Hemoglobin')
    .replace(/Chol?esterol/gi, 'Cholesterol')
    .replace(/Crea[tl][i1]nine/gi, 'Creatinine')
    .replace(/Caiculatea|Calcuiated/gi, 'Calculated');

  // Verbal one-sided ranges -> symbolic, so a single range parser handles all
  t = t
    .replace(/\b(?:up\s*to|upto|less\s+than|below|not\s+more\s+than|max(?:imum)?\.?)\s*:?\s*(?=\d)/gi, '<')
    .replace(/\b(?:above|more\s+than|greater\s+than|over|min(?:imum)?\.?)\s*:?\s*(?=\d)/gi, '>');

  return t;
}

// Fix digit-lookalike OCR errors inside numeric tokens only ("l2.5" -> "12.5",
// "1O0" -> "100"). Never applied to words, so names stay intact.
function fixNumericToken(tok) {
  if (!/\d/.test(tok)) return tok;
  return tok.replace(/[OoIl|]/g, ch => (ch === 'O' || ch === 'o' ? '0' : '1'));
}

// Strip thousands separators: "1,23,000" (Indian) and "123,000" -> plain digits
function stripNumberCommas(line) {
  return line.replace(/(\d),(?=\d{2,3}\b|\d{2,3},)/g, '$1');
}

// ---------------------------------------------------------------------------
// 3. Range / value / unit tokenizers
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

function numericTokens(text) {
  const tokens = [];
  const re = /[\dOoIl|]*\d[\dOoIl|]*(?:\.\d+)?/g;
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

// --- OCR decimal-loss repair -------------------------------------------------
// Low-res scans drop decimal points ("0.6 - 1.3" reads as "06 - 13",
// "11.4" as "114"). The knowledge base acts as a magnitude prior: a number
// is "credible" for an analyte when it sits within 3x of the expected
// bound, so dividing by 10/100 is only accepted when the raw number is NOT
// credible and the shifted one is. Genuine extreme values (glucose 450)
// pass the raw check first and are never touched.
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
// 4. Status
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
// 5. Per-line extraction
// ---------------------------------------------------------------------------
const SERUM_PREFIX = /^(?:s\.|sr\.?|serum|plasma|blood|whole blood)\s+/i;

function matchAnalyte(line) {
  for (const entry of ALIAS_INDEX) {
    const m = line.match(entry.re);
    if (m) return { analyte: entry.analyte, index: m.index, matched: m[0] };
  }
  return null;
}

function extractFromLine(line, nextLine) {
  const cleanLine = stripNumberCommas(line.replace(SERUM_PREFIX, ''));
  const hit = matchAnalyte(cleanLine);
  if (!hit) return null;

  let rest = cleanLine.slice(hit.index + hit.matched.length).replace(/^[\s:.\-]+/, '');

  // Column wrap: name on one line, numbers on the next
  if (!/\d/.test(rest) && nextLine && /\d/.test(nextLine)) {
    rest = stripNumberCommas(nextLine.trim());
  }
  if (!/\d/.test(rest)) return null;

  // Identify the printed reference range first, then exclude its numbers
  // from value candidates.
  const range = findRange(rest);
  const tokens = numericTokens(rest).filter(tok =>
    !range || tok.index < range.index || tok.index >= range.index + range.raw.length
  );
  if (tokens.length === 0) return null;

  // Pick the first token that is plausible for this analyte; allow a
  // unit-driven rescale, and re-route percent<->absolute differential pairs.
  let analyte = hit.analyte;
  let chosen = null;
  let unit = null;

  for (const tok of tokens) {
    const unitHit = findUnit(rest, tok.end);
    let value = tok.value;
    if (unitHit && unitHit.scale !== 1 && analyte.scale) value *= unitHit.scale;

    const fits = value >= analyte.sanity.min && value <= analyte.sanity.max;
    if (fits) { chosen = { ...tok, value }; unit = unitHit; break; }

    // Decimal-loss repair for values: only for dot-less tokens that fail
    // sanity outright ("114" for hemoglobin -> 11.4). Must also be credible
    // against the KB range so we never invent plausible-looking data.
    if (!/\./.test(tok.raw) && tok.value >= 100) {
      const anchor = analyte.range.high !== null ? analyte.range.high : analyte.range.low;
      for (const d of [10, 100]) {
        const v = value / d;
        if (v >= analyte.sanity.min && v <= analyte.sanity.max && credible(v, anchor)) {
          chosen = { ...tok, value: v };
          unit = unitHit;
          break;
        }
      }
      if (chosen) break;
    }

    // Differential count written as absolute next to a % analyte (or vice versa)
    if (analyte.siblingAbs) {
      const sib = BY_KEY.get(analyte.siblingAbs);
      let sv = tok.value * (unitHit && sib.scale ? unitHit.scale : 1);
      if (sv >= sib.sanity.min && sv <= sib.sanity.max && sv > 100) {
        analyte = sib;
        chosen = { ...tok, value: sv };
        unit = unitHit;
        break;
      }
    }
  }
  if (!chosen) return null;

  // Explicit H/L flag straight after the value ("5.9 H", "132 L")
  const afterValue = rest.slice(chosen.end, chosen.end + 12);
  const flag = afterValue.match(/^\s*(?:\*\s*)?(H|L)(?![a-zA-Z])/);

  // Printed range must also be plausible as a range for this analyte -
  // a date like "12-04" next to glucose should not become its range.
  let printedRange = null;
  if (range) {
    const scaleForRange =
      analyte.scale && unit && unit.scale !== 1 &&
      (range.high !== null ? range.high : range.low) < analyte.sanity.min
        ? unit.scale : 1;
    let lo = range.low === null ? null : range.low * scaleForRange;
    let hi = range.high === null ? null : range.high * scaleForRange;

    // Repair decimal-loss in printed bounds against the KB prior
    // ("06 - 13" for creatinine -> 0.6 - 1.3), reverting if the repair
    // breaks range ordering.
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
  if (printedRange) {
    status = statusFromBounds(chosen.value, printedRange.low, printedRange.high);
    normalRange = printedRange.text;
  } else if (flag) {
    status = flag[1] === 'H' ? 'High' : 'Low';
    normalRange = formatKbRange(analyte);
  } else if (analyte.range.low !== null || analyte.range.high !== null) {
    status = statusFromBounds(chosen.value, analyte.range.low, analyte.range.high);
    normalRange = formatKbRange(analyte);
  } else {
    status = 'Unknown';
    normalRange = 'N/A';
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
