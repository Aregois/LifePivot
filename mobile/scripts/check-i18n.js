const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');
const baseLocale = 'en';
const targetLocales = ['es', 'ru', 'fr', 'hy', 'ja', 'zh'];

function flattenKeys(obj, prefix = '') {
  let result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value, fullPath));
    } else if (typeof value === 'string') {
      result[fullPath] = value;
    }
  }
  return result;
}

function extractParams(str) {
  const matches = str.match(/\{([a-zA-Z0-9_]+)\}/g);
  return matches ? matches.map((m) => m.replace(/[{}]/g, '')).sort() : [];
}

const baseFilePath = path.join(localesDir, `${baseLocale}.json`);
if (!fs.existsSync(baseFilePath)) {
  console.error(`Base locale file not found: ${baseFilePath}`);
  process.exit(1);
}

const baseJson = JSON.parse(fs.readFileSync(baseFilePath, 'utf8'));
const baseFlat = flattenKeys(baseJson);
const baseKeyCount = Object.keys(baseFlat).length;

console.log(`\n========================================`);
console.log(`  LifePivot i18n Key Parity Check`);
console.log(`  Source of Truth: ${baseLocale}.json (${baseKeyCount} flattened keys)`);
console.log(`========================================\n`);

let hasError = false;

targetLocales.forEach((locale) => {
  const filePath = path.join(localesDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ [${locale.toUpperCase()}] Missing file: ${locale}.json`);
    hasError = true;
    return;
  }

  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const flat = flattenKeys(json);

  const missingKeys = [];
  const mismatchedParams = [];

  for (const [key, baseValue] of Object.entries(baseFlat)) {
    // Check if key exists (or plural variant exists)
    if (flat[key] === undefined) {
      missingKeys.push(key);
    } else {
      // Validate parameters
      const baseParams = extractParams(baseValue);
      const targetParams = extractParams(flat[key]);
      const missingParam = baseParams.filter((p) => !targetParams.includes(p));

      if (missingParam.length > 0) {
        mismatchedParams.push({
          key,
          expected: baseParams,
          actual: targetParams,
          missing: missingParam,
        });
      }
    }
  }

  if (missingKeys.length === 0 && mismatchedParams.length === 0) {
    console.log(`✅ [${locale.toUpperCase()}] 100% Parity (${Object.keys(flat).length} keys, all parameters verified)`);
  } else {
    hasError = true;
    console.error(`\n❌ [${locale.toUpperCase()}] Validation Issues Found:`);
    if (missingKeys.length > 0) {
      console.error(`   Missing ${missingKeys.length} key(s):`);
      missingKeys.slice(0, 10).forEach((k) => console.error(`     - ${k}`));
      if (missingKeys.length > 10) console.error(`     ... and ${missingKeys.length - 10} more`);
    }
    if (mismatchedParams.length > 0) {
      console.error(`   Mismatched parameters in ${mismatchedParams.length} key(s):`);
      mismatchedParams.slice(0, 5).forEach((item) => {
        console.error(`     - ${item.key}: expected [${item.expected.join(', ')}], missing: [${item.missing.join(', ')}]`);
      });
    }
  }
});

console.log(`\n========================================`);
if (hasError) {
  console.error(`❌ i18n parity check FAILED. Please resolve missing keys/parameters.\n`);
  process.exit(1);
} else {
  console.log(`🎉 All 7 locales passed with 100% key parity & parameter integrity!\n`);
  process.exit(0);
}
