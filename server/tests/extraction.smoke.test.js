/*
 * Smoke test for the local extraction engine. Plain Node, no test framework:
 *   node server/tests/extraction.smoke.test.js
 * Exits non-zero on failure, so it can run in CI.
 */

const { extractHealthParameters } = require('../utils/parameterExtractor');
const { generateInsights } = require('../services/insightsService');

let failures = 0;
function check(label, actual, expected) {
    const pass = JSON.stringify(actual) === JSON.stringify(expected);
    if (!pass) {
        failures++;
        console.error(`  ✗ ${label}\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`);
    } else {
        console.log(`  ✓ ${label}`);
    }
}
function find(params, name) {
    return params.find(p => p.name === name);
}

// ---------------------------------------------------------------------------
// 1. Indian lab format (SRL/Dr Lal style): "Test : value unit range", serum
//    prefixes, lakh/cumm platelets, Upto ranges, H/L flags
// ---------------------------------------------------------------------------
const indianReport = `
HAEMATOLOGY REPORT
Patient ID: 20251007-8841   Collected: 07-10-2026

Haemoglobin           11.2   g/dL        13.0 - 17.0
Total Leucocyte Count 11,800 /cumm       4000 - 11000
Platelet Count        1.65   Lakhs/cumm  1.5 - 4.5
Neutrophils           72     %           40 - 70
Lymphocytes           20     %           20 - 40
Absolute Eosinophil Count 440 /cumm      20 - 500

BIOCHEMISTRY
S. Creatinine         1.1    mg/dL       0.6 - 1.3
Blood Urea            32     mg/dL       15 - 40
Uric Acid             8.4 H  mg/dL       3.5 - 7.2
SGPT                  52     U/L         Upto 45
SGOT                  38     U/L         Upto 40
Fasting Blood Sugar   108    mg/dL       70 - 99
HbA1c                 6.1    %           4.0 - 5.6
TSH                   7.8    µIU/mL      0.4 - 4.5
Vitamin D             14.2   ng/mL       30 - 100
`;

console.log('\n[1] Indian lab format');
const p1 = extractHealthParameters(indianReport);

check('Hemoglobin flagged Low (report range)', (find(p1, 'Hemoglobin') || {}).status, 'Low');
check('Hemoglobin value', (find(p1, 'Hemoglobin') || {}).value, 11.2);
check('WBC comma value parsed', (find(p1, 'White Blood Cell Count') || {}).value, 11800);
check('WBC flagged High', (find(p1, 'White Blood Cell Count') || {}).status, 'High');
check('Platelets lakh-scaled', (find(p1, 'Platelet Count') || {}).value, 165000);
check('Platelets Normal (range scaled too)', (find(p1, 'Platelet Count') || {}).status, 'Normal');
check('Neutrophils High at 72%', (find(p1, 'Neutrophils') || {}).status, 'High');
check('AEC captured, not confused with ALC', (find(p1, 'Absolute Eosinophil Count') || {}).value, 440);
check('Serum prefix stripped (Creatinine)', (find(p1, 'Creatinine') || {}).value, 1.1);
check('Uric Acid High', (find(p1, 'Uric Acid') || {}).status, 'High');
check('SGPT maps to ALT, Upto-range High', (find(p1, 'ALT (SGPT)') || {}).status, 'High');
check('SGOT maps to AST, Normal', (find(p1, 'AST (SGOT)') || {}).status, 'Normal');
check('FBS maps to Glucose (Fasting), High', (find(p1, 'Glucose (Fasting)') || {}).status, 'High');
check('"Fasting" did NOT create a false AST', p1.filter(p => p.name === 'AST (SGOT)').length, 1);
check('HbA1c High at 6.1', (find(p1, 'Hemoglobin A1c') || {}).status, 'High');
check('TSH High', (find(p1, 'TSH') || {}).status, 'High');
check('Vitamin D Low', (find(p1, 'Vitamin D (25-OH)') || {}).status, 'Low');

// ---------------------------------------------------------------------------
// 2. US lab format (Quest/LabCorp style): different range notation,
//    x10^3 units, lipid panel with < ranges
// ---------------------------------------------------------------------------
const usReport = `
LIPID PANEL
Cholesterol, Total    224  mg/dL    <200
HDL Cholesterol       38   mg/dL    >40
LDL Cholesterol, Calculated  152 mg/dL  <100
Triglycerides         188  mg/dL    <150

CBC WITH DIFFERENTIAL
WBC                   7.2  x10^3/uL     4.0 to 11.0
MCHC                  33.1 g/dL         32.0 to 36.0
MCH                   29.5 pg           27.0 to 33.0

METABOLIC
Glucose               95   mg/dL        70-99
Potassium             5.4  mEq/L        3.5-5.1
eGFR                  88   mL/min/1.73m2  >60
`;

console.log('\n[2] US lab format');
const p2 = extractHealthParameters(usReport);

check('Total Cholesterol High vs <200', (find(p2, 'Total Cholesterol') || {}).status, 'High');
check('HDL Low vs >40', (find(p2, 'HDL Cholesterol') || {}).status, 'Low');
check('LDL High', (find(p2, 'LDL Cholesterol') || {}).status, 'High');
check('WBC x10^3 scaled to absolute', (find(p2, 'White Blood Cell Count') || {}).value, 7200);
check('WBC Normal (range scaled)', (find(p2, 'White Blood Cell Count') || {}).status, 'Normal');
check('MCHC not swallowed by MCH', (find(p2, 'MCHC') || {}).value, 33.1);
check('MCH correct', (find(p2, 'MCH') || {}).value, 29.5);
check('Bare Glucose maps to random glucose', (find(p2, 'Glucose (Random)') || {}).value, 95);
check('Potassium High', (find(p2, 'Potassium') || {}).status, 'High');
check('eGFR Normal vs >60', (find(p2, 'eGFR') || {}).status, 'Normal');

// ---------------------------------------------------------------------------
// 3. Noisy OCR text: digit lookalikes, broken units, missing ranges
//    (knowledge-base fallback ranges must kick in)
// ---------------------------------------------------------------------------
const noisyReport = `
Haemog1obin        l2.8  g/dl
Tota1 Cholesterol  2l2   mg/ol
Triglycendes       16O   mg/dL
Creatinine         0.9
TSH                2.1
`;

console.log('\n[3] Noisy OCR with KB fallback ranges');
const p3 = extractHealthParameters(noisyReport);

check('Hemoglobin digit-fix (l2.8 -> 12.8)', (find(p3, 'Hemoglobin') || {}).value, 12.8);
check('Cholesterol digit-fix (2l2 -> 212)', (find(p3, 'Total Cholesterol') || {}).value, 212);
check('Cholesterol High via KB fallback', (find(p3, 'Total Cholesterol') || {}).status, 'High');
check('Triglycerides OCR-word + 16O fix', (find(p3, 'Triglycerides') || {}).value, 160);
check('Creatinine Normal via KB range', (find(p3, 'Creatinine') || {}).status, 'Normal');
check('Creatinine KB range displayed', (find(p3, 'Creatinine') || {}).normalRange, '0.6 - 1.3');
check('TSH Normal', (find(p3, 'TSH') || {}).status, 'Normal');

// ---------------------------------------------------------------------------
// 4. Insights engine on the Indian report's parameters
// ---------------------------------------------------------------------------
console.log('\n[4] Insights engine');
const insights = generateInsights(p1);

check('Outlier count matches', insights.outliers.length, p1.filter(p => p.status === 'High' || p.status === 'Low').length);
check('Risk level is valid enum', ['Low', 'Moderate', 'High', 'Unknown'].includes(insights.riskLevel), true);
check('Severities are valid enum', insights.outliers.every(o => ['Mild', 'Moderate', 'Severe', 'Unknown', 'Low', 'High'].includes(o.severity)), true);
check('Every outlier has a recommendation', insights.outliers.every(o => o.recommendation && o.recommendation.length > 10), true);
check('Summary names the outliers', insights.summary.includes('Vitamin D'), true);

// ---------------------------------------------------------------------------
// 5. Adversarial regressions - every case here previously fabricated or
//    corrupted a value (found by code review). Missing a value is acceptable;
//    inventing one never is.
// ---------------------------------------------------------------------------
const adversarialReport = `
CITY LAB   Pt. Age: 45 Yrs   Sex: M
Report Date: Glucose test done (12/04/2026)
Neutrophils            4500   /cumm      2000 - 7000
Triglycerides          2500   mg/dL      < 150
Hemoglobin             114    g/dL       13.0 - 17.0
Vitamin D, 25-Hydroxy  14.2   ng/mL      30 - 100
WBC (x10^3/uL)         7.2               4.0 to 11.0
T3    T4    TSH
150   8.2   2.5
Potassium  5.9 H  mEq/L
`;

console.log('\n[5] Adversarial regressions');
const p5 = extractHealthParameters(adversarialReport);

check('"Pt. Age: 45" does NOT fabricate Prothrombin Time', find(p5, 'Prothrombin Time'), undefined);
check('Date "(12/04/2026)" does NOT fabricate a glucose value', find(p5, 'Glucose (Random)'), undefined);
check('Absolute count rerouted, not shrunk to a fake %', (find(p5, 'Absolute Neutrophil Count') || {}).value, 4500);
check('No fake Neutrophils % from the absolute row', find(p5, 'Neutrophils'), undefined);
check('Extreme-but-real Triglycerides 2500 preserved', (find(p5, 'Triglycerides') || {}).value, 2500);
check('Triglycerides still graded High', (find(p5, 'Triglycerides') || {}).status, 'High');
check('Decimal-loss 114 repaired to 11.4 (range corroborates)', (find(p5, 'Hemoglobin') || {}).value, 11.4);
check('Vitamin D value is 14.2, not the 25 from its own name', (find(p5, 'Vitamin D (25-OH)') || {}).value, 14.2);
check('Unit-before-value WBC scaled to 7200', (find(p5, 'White Blood Cell Count') || {}).value, 7200);
check('WBC Normal (header range scaled)', (find(p5, 'White Blood Cell Count') || {}).status, 'Normal');
check('Panel header row does NOT misattribute T3 value to TSH', find(p5, 'TSH'), undefined);
check('H flag honored for Potassium', (find(p5, 'Potassium') || {}).status, 'High');

// Pipe-table layout: separators must not corrupt digits
const pipeReport = `
Glucose     |108|   mg/dL   |70 - 99|
Hemoglobin  |14.2|  g/dL    |13.0 - 17.0|
`;
const p5b = extractHealthParameters(pipeReport);
check('Pipe-wrapped value 108 intact', (find(p5b, 'Glucose (Random)') || {}).value, 108);
check('Pipe-wrapped 14.2 intact', (find(p5b, 'Hemoglobin') || {}).value, 14.2);

// Insights must use numeric bounds (no re-parsing drift)
const sev = generateInsights(p5).outliers.find(o => o.parameter === 'Triglycerides');
check('Severity graded from numeric bounds (TG 2500 vs <150 = Severe)', (sev || {}).severity, 'Severe');

// ---------------------------------------------------------------------------
// 6. Schema compliance - every parameter must satisfy the Report model
// ---------------------------------------------------------------------------
console.log('\n[6] Schema compliance');
const all = [...p1, ...p2, ...p3, ...p5, ...p5b];
check('All have required name', all.every(p => typeof p.name === 'string' && p.name.length > 0), true);
check('All numeric values', all.every(p => typeof p.value === 'number' && !isNaN(p.value)), true);
check('All status in enum', all.every(p => ['Normal', 'High', 'Low', 'Abnormal', 'Unknown', 'Present', 'Absent', 'N/A'].includes(p.status)), true);
check('All parameterType numeric', all.every(p => p.parameterType === 'numeric'), true);

console.log(`\n${failures === 0 ? '✅ ALL CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`} (${all.length} parameters extracted across 3 formats)`);
process.exit(failures === 0 ? 0 : 1);
