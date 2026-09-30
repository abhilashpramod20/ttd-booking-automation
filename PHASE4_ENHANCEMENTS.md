# Phase 4: Booking Form - Enhancement Summary

## Overview
Phase 4 handles navigation to the booking form page and filling pilgrim details for 3 persons. All enhancements focus on robustness, error recovery, and multi-selector fallback patterns.

## Key Improvements

### 1. Modal Closure Before Navigation
- **Location**: Lines 1143-1171
- **Purpose**: Ensures confirmation dialog from Phase 3 is fully closed before navigating
- **Methods**:
  - Detects modal presence via DOM query
  - Removes modal backdrop that blocks clicks
  - Force-removes modal from DOM if persistent
  - Retries closure on first attempt failure
- **Result**: Prevents navigation failures due to lingering dialogs

### 2. Explicit Booking Form Navigation
- **Location**: Lines 1177-1188
- **URL Target**: `https://tirupatibalaji.ap.gov.in/#/bookingForm`
- **Timeout**: 10 seconds (networkidle)
- **Error Handling**: Graceful continuation if timeout
- **Screenshots**: Pre-form state captured before field detection

### 3. Enhanced Field Detection (All Fields)

#### Name Field (Step 1)
- **Selectors** (in priority order):
  1. ID: `#fName{N}` 
  2. Name attribute: `input[name="fName{N}"]`
  3. ng-model: `input[ng-model*="fName{N}"]`
  4. ng-model alt: `input[ng-model*="firstName"]`
  5. Data attribute: `input[data-field="firstName-{N}"]`
  6. Placeholder: `input[placeholder*="Name"]`
  7. Person section fallback: Queries person container for first text input
- **Field Manipulation**:
  - Focus element before value set
  - Dispatch: input, change, blur events
  - Trigger AngularJS digest cycle (safe try-catch)
  - Result logged with person name

#### Age Field (Step 2)
- **Selectors** (in priority order):
  1. Name attribute: `input[name="age{N}"]`
  2. ID: `#age{N}`
  3. ng-model: `input[ng-model*="age{N}"]`
  4. ng-model alt: `input[ng-model*="age"]`
  5. Data attribute: `input[data-field="age-{N}"]`
- **Special Handling**:
  - 1500ms wait after change (allows proof type options to populate)
  - Triggers Angular scope.$apply() after value set
- **Result**: Age value logged, ID proof options refresh triggered

#### Gender Select (Step 3)
- **Selectors** (in priority order):
  1. Name attribute: `select[name="gender{N}"]`
  2. ID: `#gender{N}`
  3. ng-model: `select[ng-model*="gender{N}"]`
  4. ng-model alt: `select[ng-model*="gender"]`
  5. Data attribute: `select[data-field="gender-{N}"]`
- **Option Matching**:
  - Exact value match first
  - Falls back to text content contains match
  - Case-insensitive comparison
  - Triggers Angular digest after selection
- **Result**: Selected value logged

#### ID Proof Type (Step 4)
- **Selectors** (in priority order):
  1. Name: `select[name="proofS{N}"]`
  2. ID: `#proofS{N}`
  3. ng-model: `select[ng-model*="selectedProof{N}"]`
  4. ng-model alt: `select[ng-model*="selectedProof"]`
  5. Data attribute: `select[data-field="proofType-{N}"]`
- **Selection Logic**:
  - Lists all available options with values and text
  - Searches for "Aadhaar" in option text (case-insensitive)
  - **Fallback**: If Aadhaar not found, selects first available option
  - Logs fallback selection with warning
  - 1000ms wait after selection (allows proof ID field to enable)
- **Result**: Selected proof type logged, fallback logged if needed

#### ID Proof Number (Step 5)
- **Selectors** (in priority order):
  1. ID: `#proofId{N}`
  2. Name: `input[name="proofId{N}"]`
  3. ng-model: `input[ng-model*="photoId{N}"]`
  4. ng-model alt: `input[ng-model*="photoId"]`
  5. Data attribute: `input[data-field="proofId-{N}"]`
- **Field Manipulation**: Same as name field (focus, events, Angular digest)
- **Result**: Proof number logged

### 4. Per-Person Screenshots
- **Location**: Line 1495 (after each person)
- **Naming**: `13-person-{N}-filled.png`
- **Purpose**: Visual verification of form state after each person's data
- **Combined**: `14-all-pilgrims-filled.png` after all 3 persons complete

### 5. Submit/Continue Button Handler (Phase 4C)
- **Location**: Lines 1545-1618
- **Detection Strategies**:
  1. Playwright locator: `button:has-text("Continue")`
  2. Playwright locator: `button:has-text("Submit")`
  3. Playwright locator: `button:has-text("Next")`
  4. Playwright locator: `button.btn-primary`
  5. Playwright locator: `button[type="submit"]`
  6. Playwright locator: First button element
  7. JavaScript fallback: Search by text content (case-insensitive)

- **Click Methods**:
  - Playwright click (timeout: 3000ms)
  - JavaScript click (if Playwright fails)
  - Dispatches native MouseEvent with bubbling enabled
  - Safe try-catch on all operations

- **Post-Submit Handling**:
  - 2000ms wait for page updates
  - Attempts page navigation detection (5s timeout)
  - Falls back to 3s wait if navigation not detected
  - Screenshot after submit
  - Graceful handling if no button found

### 6. Robust Error Handling

#### For All Fields:
- Individual try-catch per person
- Logs error but continues to next person
- Decision logging for audit trail
- Continues even if form fields missing
- Fallback options for missing proof types

#### For Form Submission:
- Multiple detection strategies (6 button selectors)
- Fallback to JavaScript if Playwright fails
- Warning if no submit button found (form may auto-submit)
- Navigation verification with graceful timeout

### 7. Logging & Audit Trail
- Each field fill action logged with value
- Failed field detections logged as errors
- Fallback selections logged with reason
- Decision tree tracked: `logDecision()` calls
- Final state and URL captured

## File Locations
- Main script: `scripts/full-flow.js` (lines 1143-1618)
- Phase 4 spans: Navigation (1177) → Form fill (1234-1539) → Submit (1545-1618)

## Data Structure
```javascript
const pilgrims = [
  {
    name: "Mk Pramod",
    age: 65,
    gender: "Male",
    proofType: "Aadhaar Card",
    proofNumber: "916317674472"
  },
  // ... (3 persons total)
];
```

## Testing Checklist
- [ ] Modal closes before navigation
- [ ] Navigation to `#/bookingForm` succeeds
- [ ] Name fields fill for all 3 persons
- [ ] Age fields fill and proof type options update
- [ ] Gender selection works
- [ ] Proof type defaults to Aadhaar or first available
- [ ] Proof ID numbers fill correctly
- [ ] Person screenshots captured
- [ ] Submit/Continue button found and clicked
- [ ] Page navigates or updates after submit
- [ ] All logs capture accurately

## Known Limitations
1. If form uses dynamic ng-repeat with different IDs, fallback selector may not find fields
2. If proof type options load asynchronously, 1000ms wait may be insufficient
3. If submit button is hidden/aria-hidden, JavaScript click may fail
4. Requires AngularJS framework (safe try-catch handles non-Angular forms)

## Next Steps (Post-Phase 4)
- Payment processing or booking confirmation
- Final booking state verification
- Browser keep-alive for manual completion option
