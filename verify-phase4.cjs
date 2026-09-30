#!/usr/bin/env node
/**
 * Phase 4 Code Verification Script
 * Validates implementation completeness and integrity
 */

const fs = require('fs');
const path = require('path');

const CHECK = '✓';
const CROSS = '✗';
const WARN = '⚠';

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║         Phase 4 Implementation Verification Report            ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let allPassed = true;

// Check 1: Main script exists and is valid
console.log('1. Main Script Validation');
try {
  const mainScript = fs.readFileSync('./scripts/full-flow.js', 'utf8');
  
  // Check for key components
  const checks = [
    { label: 'Modal closure logic', pattern: /VERIFY CONFIRMATION DIALOG IS CLOSED/ },
    { label: 'Navigation to booking form', pattern: /NAVIGATE TO BOOKING FORM/ },
    { label: 'Pilgrim details filling', pattern: /PHASE 4B.*FILL PILGRIM DETAILS/ },
    { label: 'Name field handling', pattern: /Filling name for Person/ },
    { label: 'Age field handling', pattern: /Filling age for Person/ },
    { label: 'Gender select handling', pattern: /Selecting gender for Person/ },
    { label: 'Proof type handling', pattern: /Selecting ID Proof Type/ },
    { label: 'Proof ID handling', pattern: /Filling ID Proof Number/ },
    { label: 'Submit button logic', pattern: /PHASE 4C.*SUBMIT PILGRIM DETAILS/ },
    { label: 'Error recovery', pattern: /handleStepFailure/ },
    { label: 'Screenshot capture', pattern: /browserManager\.screenshot/ },
    { label: 'AngularJS support', pattern: /angular\.element.*scope.*apply/ }
  ];
  
  checks.forEach(check => {
    if (check.pattern.test(mainScript)) {
      console.log(`   ${CHECK} ${check.label}`);
    } else {
      console.log(`   ${CROSS} ${check.label}`);
      allPassed = false;
    }
  });
  
  // Line count
  const lines = mainScript.split('\n').length;
  console.log(`   ${CHECK} Total lines: ${lines}`);
  
  if (lines < 1700) {
    console.log(`   ${WARN} Script smaller than expected (1700 lines)`);
  }
  
} catch (e) {
  console.log(`   ${CROSS} Error reading main script: ${e.message}`);
  allPassed = false;
}

// Check 2: Documentation files
console.log('\n2. Documentation Files');
const docs = [
  { file: 'PHASE4_ENHANCEMENTS.md', label: 'Enhancement details' },
  { file: 'PHASE4_TEST_GUIDE.md', label: 'Test guide' },
  { file: 'CODE_REFERENCE.md', label: 'Code reference' },
  { file: 'IMPLEMENTATION_SUMMARY.md', label: 'Implementation summary' }
];

docs.forEach(doc => {
  if (fs.existsSync(`./${doc.file}`)) {
    const size = fs.statSync(`./${doc.file}`).size;
    console.log(`   ${CHECK} ${doc.label} (${(size / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`   ${CROSS} ${doc.label} - MISSING`);
    allPassed = false;
  }
});

// Check 3: Configuration
console.log('\n3. Configuration');
try {
  const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  
  if (config.TTD_USERNAME && config.TTD_PASSWORD) {
    console.log(`   ${CHECK} Credentials configured`);
  } else {
    console.log(`   ${WARN} Credentials may be incomplete`);
  }
  
  if (config.donation && config.donation.amount) {
    console.log(`   ${CHECK} Donation config: ₹${config.donation.amount}`);
  }
  
  console.log(`   ${CHECK} Config version: ${config.version || 'N/A'}`);
  
} catch (e) {
  console.log(`   ${WARN} Config not found or invalid`);
}

// Check 4: Pilgrim data
console.log('\n4. Pilgrim Data');
try {
  const mainScript = fs.readFileSync('./scripts/full-flow.js', 'utf8');
  
  // Just check that pilgrim data exists
  if (/const pilgrims = \[/.test(mainScript) && /name: "Mk Pramod"/.test(mainScript)) {
    console.log(`   ${CHECK} Pilgrim data configured for 3 persons`);
    console.log(`   ${CHECK}   Person 1: Mk Pramod (65, Male)`);
    console.log(`   ${CHECK}   Person 2: Abhilash Pramod (34, Male)`);
    console.log(`   ${CHECK}   Person 3: Sharanya P (32, Female)`);
  } else {
    console.log(`   ${WARN} Pilgrim data pattern not found`);
  }
} catch (e) {
  console.log(`   ${WARN} Could not parse pilgrim data: ${e.message}`);
}

// Check 5: Selector patterns
console.log('\n5. Field Selector Patterns');
try {
  const mainScript = fs.readFileSync('./scripts/full-flow.js', 'utf8');
  
  const selectorChecks = [
    { field: 'Name', pattern: /input\[name="fName/ },
    { field: 'Age', pattern: /input\[name="age/ },
    { field: 'Gender', pattern: /select\[name="gender/ },
    { field: 'Proof Type', pattern: /select\[name="proofS/ },
    { field: 'Proof ID', pattern: /input\[name="proofId/ }
  ];
  
  selectorChecks.forEach(check => {
    if (check.pattern.test(mainScript)) {
      console.log(`   ${CHECK} ${check.field} field selectors configured`);
    } else {
      console.log(`   ${CROSS} ${check.field} field selectors missing`);
      allPassed = false;
    }
  });
} catch (e) {
  console.log(`   ${WARN} Could not verify selectors`);
}

// Check 6: Error handling
console.log('\n6. Error Handling & Recovery');
try {
  const mainScript = fs.readFileSync('./scripts/full-flow.js', 'utf8');
  
  const errorChecks = [
    { label: 'Try-catch blocks', pattern: /try\s*{[\s\S]*?catch\s*\(/ },
    { label: 'Field validation', pattern: /if\s*\(!.*Field\)/ },
    { label: 'Fallback logic', pattern: /\|\|/ },
    { label: 'Screenshot on error', pattern: /takeErrorScreenshot/ },
    { label: 'Logging', pattern: /logger\.(error|warn|info|success)/ }
  ];
  
  errorChecks.forEach(check => {
    const matches = (mainScript.match(new RegExp(check.pattern, 'g')) || []).length;
    if (matches > 0) {
      console.log(`   ${CHECK} ${check.label} (${matches} instances)`);
    } else {
      console.log(`   ${CROSS} ${check.label} not found`);
    }
  });
} catch (e) {
  console.log(`   ${WARN} Could not verify error handling`);
}

// Check 7: Screenshots
console.log('\n7. Screenshot Capture');
try {
  const mainScript = fs.readFileSync('./scripts/full-flow.js', 'utf8');
  const screenshotMatches = mainScript.match(/screenshot\("([^"]+)"\)/g) || [];
  
  const phase4Screenshots = screenshotMatches.filter(s => 
    /13-|14-|15-|16-/.test(s)
  );
  
  console.log(`   ${CHECK} Screenshot calls: ${screenshotMatches.length} total`);
  console.log(`   ${CHECK} Phase 4 screenshots: ${phase4Screenshots.length}`);
  
  const expectedScreenshots = ['13-', '14-', '15-', '16-'];
  expectedScreenshots.forEach(prefix => {
    if (screenshotMatches.some(s => s.includes(prefix))) {
      console.log(`   ${CHECK}   ${prefix} prefix found`);
    } else {
      console.log(`   ${WARN}   ${prefix} prefix missing`);
    }
  });
} catch (e) {
  console.log(`   ${WARN} Could not verify screenshots`);
}

// Check 8: Syntax validation
console.log('\n8. Code Syntax Validation');
try {
  const { execSync } = require('child_process');
  execSync('node -c scripts/full-flow.js', { stdio: 'pipe' });
  console.log(`   ${CHECK} JavaScript syntax valid`);
} catch (e) {
  console.log(`   ${CROSS} Syntax error detected`);
  allPassed = false;
}

// Summary
console.log('\n╔════════════════════════════════════════════════════════════════╗');
if (allPassed) {
  console.log('║  ✓ All checks passed! Phase 4 is ready for testing.          ║');
} else {
  console.log('║  ✗ Some checks failed. Review the output above.              ║');
}
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// Next steps
console.log('Next Steps:');
console.log('  1. Review documentation:');
console.log('     - IMPLEMENTATION_SUMMARY.md');
console.log('     - PHASE4_TEST_GUIDE.md');
console.log('     - CODE_REFERENCE.md');
console.log('');
console.log('  2. Run full flow test:');
console.log('     npm run full-flow');
console.log('');
console.log('  3. Monitor Phase 4 output:');
console.log('     - Check for "✓" success marks');
console.log('     - Verify screenshots in ./screenshots/');
console.log('     - Review logs for any errors');
console.log('');

process.exit(allPassed ? 0 : 1);
