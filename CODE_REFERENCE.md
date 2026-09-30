# Phase 4 Code Reference & Selector Guide

## Quick Reference: Selector Patterns

### Name Field (All 3 Persons)
```javascript
// Selectors tried in order:
#fName1          // Person 1 name field (by ID)
#fName2          // Person 2 name field (by ID)
#fName3          // Person 3 name field (by ID)

input[name="fName1"]           // By name attribute
input[ng-model*="fName1"]      // AngularJS binding
input[ng-model*="firstName"]   // Alt ng-model pattern
input[data-field="firstName-1"]  // Data attribute

// Location in code: lines 1246-1252
```

### Age Field (All 3 Persons)
```javascript
input[name="age1"]           // Primary selector
#age1                        // By ID
input[ng-model*="age1"]      // AngularJS
input[ng-model*="age"]       // Alt pattern
input[data-field="age-1"]    // Data attribute

// Location in code: lines 1297-1302
```

### Gender Select (All 3 Persons)
```javascript
select[name="gender1"]           // Primary
#gender1                         // By ID
select[ng-model*="gender1"]      // AngularJS specific
select[ng-model*="gender"]       // Alt pattern
select[data-field="gender-1"]    // Data attribute

// Location in code: lines 1332-1337
```

### ID Proof Type Select (All 3 Persons)
```javascript
select[name="proofS1"]                    // Primary (note: "proofS" not "proofType")
#proofS1                                  // By ID
select[ng-model*="selectedProof1"]        // AngularJS specific
select[ng-model*="selectedProof"]         // Alt pattern
select[data-field="proofType-1"]          // Data attribute

// Location in code: lines 1381-1386
// **Important**: Script lists all available proof options and searches for "Aadhaar"
```

### ID Proof Number Field (All 3 Persons)
```javascript
#proofId1                              // Primary (by ID)
input[name="proofId1"]                 // By name attribute
input[ng-model*="photoId1"]            // AngularJS specific
input[ng-model*="photoId"]             // Alt pattern
input[data-field="proofId-1"]          // Data attribute

// Location in code: lines 1463-1467
```

---

## Field Names Pattern

All fields follow a naming convention with person index (1-3):

| Field | Base Name | Person 1 | Person 2 | Person 3 |
|-------|-----------|----------|----------|----------|
| Name | fName | fName1 | fName2 | fName3 |
| Age | age | age1 | age2 | age3 |
| Gender | gender | gender1 | gender2 | gender3 |
| Proof Type | proofS | proofS1 | proofS2 | proofS3 |
| Proof ID | proofId | proofId1 | proofId2 | proofId3 |

---

## Code Snippets

### How Field Filling Works (General Pattern)

```javascript
// All fields follow this pattern in Phase 4B:

// Step 1: Detect field with fallback selectors
let fieldElement = await page.$(`#primarySelector`) || 
                   await page.$(`input[name="primarySelector"]`) ||
                   await page.$(`input[ng-model*="pattern"]`) ||
                   await page.$(`input[data-field="alt"]`);

// Step 2: If field not found, log error
if (!fieldElement) {
  logError(`Field not found`, { fieldId: "fieldIdentifier" });
  logger.warn(`⚠️  Field not found - skipping`);
  continue;  // Skip to next field/person
}

// Step 3: Fill field value with proper events
await page.evaluate(({ id, value }) => {
  const field = document.querySelector(`#${id}`) || 
               document.querySelector(`input[name="${id}"]`);
  if (field) {
    field.value = value;           // Set value
    field.focus();                 // Focus for handlers
    field.dispatchEvent(new Event('input', { bubbles: true }));   // Input event
    field.dispatchEvent(new Event('change', { bubbles: true }));  // Change event
    field.dispatchEvent(new Event('blur', { bubbles: true }));    // Blur event
    
    // Trigger AngularJS digest if present
    if (window.angular) {
      try {
        angular.element(field).scope().$apply();
      } catch (e) {}  // Silently fail if not Angular
    }
  }
}, { id: primarySelector, value: dataToFill });

// Step 4: Log success or move to next
logger.success(`✓ Field filled: ${value}`);
```

### Modal Closure Logic (Lines 1143-1171)

```javascript
// Check if modal still visible
let modalStillVisible = await page.evaluate(() => {
  const dialogs = document.querySelectorAll(
    '[role="dialog"], .modal, .modal-dialog, .confirmation-dialog'
  );
  return dialogs.length > 0;
}).catch(() => false);

if (modalStillVisible) {
  logger.warn("⚠️  Modal still visible, attempting force close...");
  
  // Force remove from DOM
  await page.evaluate(() => {
    const dialogs = document.querySelectorAll(
      '.modal, .modal-dialog, [role="dialog"], .confirmation-dialog'
    );
    dialogs.forEach(d => {
      d.style.display = 'none';
      d.remove();
    });
    // Also remove backdrop
    const backdrop = document.querySelector('.modal-backdrop, [class*="backdrop"]');
    if (backdrop) backdrop.remove();
  }).catch(() => {});
  
  // Verify closure
  modalStillVisible = await page.evaluate(() => {
    const dialogs = document.querySelectorAll('[role="dialog"], .modal');
    return dialogs.length > 0;
  }).catch(() => false);
}
```

### Submit Button Detection (Lines 1545-1618)

```javascript
// Strategy 1-6: Try different button selectors
const submitStrategies = [
  { selector: 'button:has-text("Continue")', name: 'Continue button' },
  { selector: 'button:has-text("Submit")', name: 'Submit button' },
  { selector: 'button:has-text("Next")', name: 'Next button' },
  { selector: 'button.btn-primary', name: 'Primary button' },
  { selector: 'button[type="submit"]', name: 'Submit type button' },
  { selector: 'button:nth-of-type(1)', name: 'First button' }
];

let submitButtonClicked = false;

for (const strategy of submitStrategies) {
  if (submitButtonClicked) break;
  
  try {
    const buttonLocator = page.locator(strategy.selector).first();
    const visible = await buttonLocator.isVisible().catch(() => false);
    
    if (visible) {
      logger.info(`Found ${strategy.name}, clicking...`);
      await buttonLocator.click({ timeout: 3000 }).catch(() => null);
      submitButtonClicked = true;
      break;
    }
  } catch (e) {
    logger.debug(`${strategy.name} strategy failed: ${e.message}`);
  }
}

// Fallback to JavaScript click if Playwright fails
if (!submitButtonClicked) {
  const jsSubmitClicked = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      const text = btn.textContent.trim().toLowerCase();
      if (['continue', 'submit', 'next', 'proceed'].includes(text)) {
        btn.click();
        return true;
      }
    }
    return false;
  });
  
  if (jsSubmitClicked) {
    submitButtonClicked = true;
  }
}
```

---

## Proof Type Selection Logic (Lines 1389-1453)

```javascript
// Get all available proof type options
const availableProofTypes = await page.evaluate((name) => {
  const select = document.querySelector(`select[name="${name}"]`);
  if (select) {
    return Array.from(select.options)
      .filter(opt => opt.value)  // Exclude empty options
      .map(opt => ({ value: opt.value, text: opt.textContent.trim() }));
  }
  return [];
}, proofSelectName);

// Log available options for debugging
logger.debug(`Available ID Proof Types: ${JSON.stringify(availableProofTypes)}`);
// Output example:
// [
//   { value: "1", text: "Aadhaar Card" },
//   { value: "2", text: "Passport" },
//   { value: "3", text: "Driver License" }
// ]

// Try to find and select Aadhaar Card
let proofTypeSelected = false;
for (const option of availableProofTypes) {
  if (option.text.toLowerCase().includes('aadhaar')) {
    // Select this option
    await page.evaluate(({ name, value }) => {
      const select = document.querySelector(`select[name="${name}"]`);
      if (select) {
        select.value = value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        if (window.angular) {
          angular.element(select).scope().$apply();
        }
      }
    }, { name: proofSelectName, value: option.value });
    
    proofTypeSelected = true;
    break;
  }
}

// Fallback: If Aadhaar not found, select first available
if (!proofTypeSelected && availableProofTypes.length > 0) {
  const firstOption = availableProofTypes[0];
  // ... select firstOption.value ...
  logger.warn(`⚠️  Aadhaar not found, selected: ${firstOption.text}`);
}
```

---

## Event Dispatch Details

Why proper event dispatch matters:

```javascript
// ❌ WRONG - Just sets value
field.value = "Mk Pramod";

// ❌ INCOMPLETE - Only click, no event handling
field.click();

// ✅ CORRECT - Full event chain (what script does)
field.value = "Mk Pramod";
field.focus();
field.dispatchEvent(new Event('input', { bubbles: true }));
field.dispatchEvent(new Event('change', { bubbles: true }));
field.dispatchEvent(new Event('blur', { bubbles: true }));

// ✅ FOR ANGULARJS - Also trigger digest cycle
if (window.angular) {
  angular.element(field).scope().$apply();
}
```

**Why each event**:
- `input`: Triggers real-time input handlers (validation, auto-complete)
- `change`: Triggers form-level change handlers
- `blur`: Triggers field-exit handlers, marks as "touched"
- `$apply()`: Triggers AngularJS digest cycle (updates view, dependent fields)

---

## Logging & Decision Tracking

Every action logged:

```javascript
// Success
logger.success(`✓ Name filled: Mk Pramod`);
logAction(`Name filled - Person 1`, { name: "Mk Pramod" });

// Warning
logger.warn(`⚠️  Gender select not found - skipping`);
logError(`Gender select not found`, { fieldName: "gender1" });

// Debug (not shown in normal output)
logger.debug(`Available options: ${JSON.stringify(options)}`);

// Decision tracking (for audit)
logDecision("Person 1 Form", ["filled"], "success");
```

---

## Screenshots Captured

```
Phase 4 Screenshots:
├── 13-booking-form-page.png       (After navigation)
├── 13-person-1-filled.png         (After Person 1 complete)
├── 13-person-2-filled.png         (After Person 2 complete)
├── 13-person-3-filled.png         (After Person 3 complete)
├── 14-all-pilgrims-filled.png     (All 3 persons visible)
├── 15-after-submit.png            (After submit button clicked)
└── 16-final-state.png             (Final state)

All saved to: ./screenshots/
```

---

## Debugging: If Field Not Found

Add this to browser console to find actual selectors:

```javascript
// Find all form inputs
document.querySelectorAll('input[type="text"], input[type="number"], select').forEach((el, idx) => {
  console.log(`${idx}: ${el.id || el.name || el.getAttribute('ng-model') || 'unnamed'} = `, el);
});

// Check for modals
console.log('Modals:', document.querySelectorAll('[role="dialog"], .modal, .modal-dialog').length);

// Check for buttons
document.querySelectorAll('button').forEach((btn, idx) => {
  console.log(`${idx}: ${btn.textContent.trim()}`);
});

// Check AngularJS
console.log('AngularJS version:', window.angular ? window.angular.version : 'not loaded');
```

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Field value set but not displayed | Events not dispatched | Add input/change/blur events + $apply() |
| Gender select changes but proof type not | Async loading | Increase wait time after age change |
| Proof type selects wrong option | Option value vs text mismatch | Match by text content, not just value |
| Submit button not found | Different button text | Add new selector to strategy list |
| Form seems to work but no page change | Form may auto-submit or validate | Check browser console for errors |

---

## Testing with Full Output

Run with debug logging:

```bash
# In scripts/full-flow.js, set:
const DEBUG = true;

# Run:
npm run full-flow 2>&1 | tee test-output.log

# Review:
grep -i "ERROR\|WARN\|success" test-output.log
```

---

## Validator Checklist

Before marking Phase 4 complete:

- [ ] Modal closed before navigation
- [ ] Navigation to bookingForm page successful
- [ ] All 5 fields filled for Person 1
- [ ] All 5 fields filled for Person 2
- [ ] All 5 fields filled for Person 3
- [ ] Submit button found and clicked
- [ ] Page updates or navigates after submit
- [ ] All screenshots captured
- [ ] All logs show success (✓) marks
- [ ] No unhandled exceptions in logs

---

**Last Updated**: 2026-08-30
**Code Version**: Phase 4 Complete
**Ready for**: Integration Testing
