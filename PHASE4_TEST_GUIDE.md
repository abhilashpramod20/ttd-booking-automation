# Phase 4 Test Plan & Verification Guide

## Pre-Test Setup
1. Ensure browser window is open from Phase 3 (login + donation)
2. Confirmation dialog should be closed automatically
3. Website should be reachable (`tirupatibalaji.ap.gov.in`)
4. Network connection stable

## Test Execution Steps

### Stage 1: Modal Closure & Navigation (5 min)
**Expected**: Modal closes, page navigates to booking form

```
Run: npm run full-flow
Wait: ~120 seconds through Phase 1-3
```

**Verification Points**:
- [ ] Phase 3 "Confirmation Dialog" completes (logs show "✓ Yes button clicked")
- [ ] Screenshot `12-after-yes-button.png` shows closed modal
- [ ] Phase 4 begins: "VERIFY CONFIRMATION DIALOG IS CLOSED"
- [ ] Screenshot `13-booking-form-page.png` shows booking form URL loaded
- [ ] Log shows: `✓ Navigated to booking form page`

**If Stuck**:
- Check browser: Are you on booking form page?
- Check timeout: Phase 4 has 10s navigation timeout
- Manual fix: Close any remaining dialogs in browser DevTools

---

### Stage 2: Pilgrim 1 Data Fill (2 min)
**Expected**: Name, Age, Gender, Proof Type, Proof ID all filled

**Log Expectations**:
```
PERSON 1/3: Filling Mk Pramod
✓ Name filled: Mk Pramod
✓ Age filled: 65
✓ Gender selected: Male
✓ ID Proof Type selected: Aadhaar Card
✓ ID Proof Number filled: 916317674472
✓ Person 1 details completed
```

**Screenshots to Check**:
- `13-person-1-filled.png` - Shows all Person 1 fields populated

**Verification Points** (in browser):
- [ ] Name field has "Mk Pramod"
- [ ] Age field has "65"
- [ ] Gender dropdown shows "Male"
- [ ] Proof type dropdown shows "Aadhaar Card"
- [ ] Proof ID field has "916317674472"

**If Any Field Missing**:
- Check browser console for JavaScript errors
- Verify field selectors match actual HTML attributes
- Note the field selector in logs (e.g., "Name field (fName1)")
- Report: Which field? Which person?

---

### Stage 3: Pilgrim 2 Data Fill (2 min)
**Expected**: Same as Stage 2 for Abhilash Pramod

```
Expected Log:
PERSON 2/3: Filling Abhilash Pramod
✓ Name filled: Abhilash Pramod
✓ Age filled: 34
✓ Gender selected: Male
✓ ID Proof Type selected: Aadhaar Card
✓ ID Proof Number filled: 862240912807
✓ Person 2 details completed
```

**Screenshots to Check**:
- `13-person-2-filled.png`

---

### Stage 4: Pilgrim 3 Data Fill (2 min)
**Expected**: Same pattern for Sharanya P

```
Expected Log:
PERSON 3/3: Filling Sharanya P
✓ Name filled: Sharanya P
✓ Age filled: 32
✓ Gender selected: Female
✓ ID Proof Type selected: Aadhaar Card
✓ ID Proof Number filled: 758129312783
✓ Person 3 details completed
```

**Screenshots to Check**:
- `13-person-3-filled.png`

---

### Stage 5: Form Submission (1 min)
**Expected**: All pilgrims filled, submit button found and clicked

**Log Expectations**:
```
✓ All pilgrim details filled successfully!
PHASE 4C: SUBMIT PILGRIM DETAILS
Trying to find Continue button...
Found Continue button, clicking...
✓ Continue button clicked successfully
Waiting for page to navigate or update after submit...
✓ Pilgrim details submitted successfully
```

**Screenshots to Check**:
- `14-all-pilgrims-filled.png` - All 3 persons visible
- `15-after-submit.png` - Page after submit clicked
- `16-final-state.png` - Final state before Phase 5

**Verification Points** (in browser):
- [ ] All 3 persons' data visible in form
- [ ] Submit/Continue button present and clickable
- [ ] After click, page updates (may show confirmation or next step)
- [ ] URL may change or form may close

---

## Success Criteria

### Full Success
- ✅ Logs show "✓" marks for all 5 fields × 3 persons (15 total)
- ✅ All 6 screenshots present in `screenshots/` directory
- ✅ Final log: "✓ Pilgrim details submitted successfully"
- ✅ Browser shows next phase UI (payment, confirmation, etc.)

### Partial Success (Acceptable)
- ✅ All 3 persons' data filled
- ⚠️ Submit button not found (form may auto-submit)
- ✅ Log shows warning but continues

### Failure Cases

| Symptom | Cause | Fix |
|---------|-------|-----|
| Modal not closing after Phase 3 | Dialog DOM not removed | Check browser DevTools, manually close modal |
| Navigation fails (ERR_NETWORK_CHANGED) | Network issue | Check internet, retry |
| Navigation times out (10s) | Booking form page slow | Increase timeout in code (line 1182) |
| Name field not found | Selector mismatch | Run test again with logging, check HTML |
| "Could not find any proof type options" | Age field didn't update proof types | Increase wait time after age (line 1314) |
| Submit button not found | Button selector mismatch | Manual click + log button text |
| Page doesn't update after submit | Form may require additional interaction | Check browser, look for validation errors |

---

## Logging Output Location
```
Logs: ~/.ttd-booking-automation/logs/full-flow-{timestamp}.log
Screenshots: ./screenshots/
  - 13-booking-form-page.png
  - 13-person-1-filled.png
  - 13-person-2-filled.png
  - 13-person-3-filled.png
  - 14-all-pilgrims-filled.png
  - 15-after-submit.png
  - 16-final-state.png
```

---

## Debug Mode
To enable detailed logging:

1. Edit `scripts/full-flow.js` line ~70:
   ```javascript
   const DEBUG = true;  // Set to true
   ```

2. Run script again - more `[DEBUG]` messages will appear

3. Check console output for:
   - Available form selectors found
   - Option values in dropdowns
   - AngularJS scope updates
   - Button text content matches

---

## Manual Recovery Procedure
If script gets stuck at any Phase 4 step:

1. **Script still running?**
   - Check browser: Are you on booking form page?
   - If yes: Script may be waiting for form detection
   - If no: Script may have navigated wrong
   - Manually navigate to: `https://tirupatibalaji.ap.gov.in/#/bookingForm`

2. **Form fields visible?**
   - If yes: You can fill manually OR
   - Press Ctrl+C to stop script and retry
   - If no: Refresh page

3. **Fields filled but no submit button?**
   - Look for "Continue", "Submit", "Proceed", or "Next" button
   - Click it manually
   - Script will detect page change and continue

4. **After manual action**:
   - Script logs will show attempted recovery
   - Browser keeps running for next phase

---

## Report Template (if issues occur)

```
**Issue**: [Describe what happened]

**Stage**: Phase 4, Stage X (of 5)
**Step**: [Which field? name/age/gender/proof/submit]
**Person**: [1/2/3 or N/A]

**Logs**:
[Paste relevant log lines]

**Screenshot**: 
[Describe what you see in latest screenshot]

**Browser State**:
[What's currently visible on screen?]

**Expected vs Actual**:
Expected: [what should happen]
Actual: [what actually happened]

**Reproducible**: Yes / No
**Environment**: macOS / Windows / Linux
```
