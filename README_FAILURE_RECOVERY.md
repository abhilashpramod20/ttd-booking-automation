# TTD Booking Automation - Universal Failure Recovery System

## Overview

This system implements **comprehensive failure recovery** for every automation step. When any step fails, the automation doesn't stop - instead, it pauses and gives the user a chance to complete the step manually, then continues automatically to the next step.

## System Architecture

### Universal Failure Handler

Located at: `scripts/full-flow.js:200-236`

The `handleStepFailure()` function provides consistent failure handling across all steps:

```javascript
async function handleStepFailure(stepName, stepDescription, page, browserManager)
```

**Behavior:**
1. Logs error with context
2. Takes screenshot of current page state
3. Displays user-friendly recovery prompt
4. Waits for user to press ENTER (no timeout)
5. Takes screenshot after manual action
6. Returns control to automation

### Recovery Principles

- **Fail Fast**: When an automated attempt fails, immediately offer manual recovery
- **No Auto-Retry**: Don't waste time with multiple retry attempts
- **No Timeout**: User can take as long as needed
- **Never Skip**: All steps must be completed (sequence integrity)
- **Clear Guidance**: Each failure has specific instructions
- **Continue to Next**: After recovery, move to the next step automatically

## Protected Steps

### 1. Login Form Loading
**File:** `scripts/full-flow.js:282-291`
**Failure Trigger:** Login form selectors not found
**Recovery Action:** User manually refreshes/waits for page load
**Next Step:** Username entry

### 2. Username Field Entry
**File:** `scripts/full-flow.js:300-313`
**Failure Trigger:** Username input field not found
**Recovery Action:** User manually enters username
**Next Step:** Password entry

### 3. Password Field Entry
**File:** `scripts/full-flow.js:315-328`
**Failure Trigger:** Password input field not found
**Recovery Action:** User manually enters password
**Next Step:** CAPTCHA check

### 4. CAPTCHA Resolution
**Failure Trigger:** OCR recognition fails
**Recovery Action:** User manually enters CAPTCHA code
**Next Step:** Donation amount entry
**Note:** Already had interactive fallback system

### 5. Donation Amount (₹30,000)
**File:** `scripts/full-flow.js:470-537`
**Failure Trigger:** Amount field not fillable after all strategies
**Recovery Action:** User manually enters amount
**Next Step:** Citizenship checkbox

### 6. Indian Citizenship Declaration Checkbox
**File:** `scripts/full-flow.js:651-677`
**Failure Trigger:** Checkbox not found or not checkable after 4 strategies
**Recovery Action:** User manually checks the checkbox
**Next Step:** Corpus donation checkbox

**Strategies Attempted (before recovery):**
- Strategy 1: Playwright `check()`
- Strategy 2: Click + event dispatch
- Strategy 3: Force click
- Strategy 4: Angular scope manipulation

### 7. Corpus Donation Checkbox
**File:** `scripts/full-flow.js:788-809`
**Failure Trigger:** Checkbox not found or not checkable after 4 strategies
**Recovery Action:** User manually checks the checkbox
**Next Step:** Continue button click
**Note:** Optional - can be disabled in config

### 8. Continue Button Click
**File:** `scripts/full-flow.js:827-839, 1013-1043`
**Failure Trigger:** Button not found OR click fails after 4 strategies
**Recovery Action:** User manually clicks the Continue button
**Next Step:** Page navigation monitoring

**Strategies Attempted (before recovery):**
- Strategy 1: Playwright `click()`
- Strategy 2: JavaScript `click()`
- Strategy 3: Force click
- Strategy 4: Angular form submit

### 9. Page Navigation to Booking Form
**File:** `scripts/full-flow.js:1013-1043`
**Failure Trigger:** URL doesn't change after 10 seconds
**Recovery Options:**
- `wait`: Wait another 10 seconds
- `manual`: User manually navigates to next step
- `proceed`: Continue without URL change
**Next Step:** Booking form (manual completion)

### 10. Global Error Recovery
**File:** `scripts/full-flow.js:1232-1278`
**Failure Trigger:** Any unhandled error in the flow
**Recovery Options:**
- `continue`: Resume automated steps
- `manual`: Keep browser for manual completion
- `exit`: Exit the script

## User Experience Flow

### When a Step Fails

```
Automated attempt → FAILS
     ↓
⚠️  STEP FAILED MESSAGE appears
     ↓
📸 Screenshot taken (manual-intervention-required-*.png)
     ↓
💬 User sees clear instructions
    "Please [specific action] in the browser"
     ↓
⏸️  Script waits (no timeout)
     ↓
User completes action manually
     ↓
User presses ENTER
     ↓
📸 Screenshot taken (after-manual-*.png)
     ↓
✅ Continues to NEXT STEP
```

### Example: Username Field Not Found

```
Script tries to find username field
  ↓ (not found)
Script triggers recovery

⚠️  STEP FAILED: Username Field

The automation encountered an issue with: 
Username field not found on login page. 
Please manually enter your username in the browser.

What you can do:
  1. Manually enter your username in the field
  2. Once done, come back here and press ENTER
  3. Automation will continue to PASSWORD ENTRY

After you've manually completed "Username Field" in the browser,
press ENTER to continue automation

Press ENTER when "Username Field" is complete: █

[User enters: abhilash.pramod@yahoo.com in browser]
[User presses ENTER]

✓ Username Field completed manually
Continuing with next step...

→ Moving to PASSWORD ENTRY
```

## Configuration Options

### Automatic Retries
- Donation amount: 1 attempt before recovery
- Checkboxes: 1 click + 4 strategies before recovery
- Continue button: 1 click + 4 strategies before recovery
- Page navigation: 10-second wait before prompting user

### Timeouts on Pauses
- **Manual recovery waits**: No timeout - indefinite wait
- **Page navigation**: 10 seconds initial wait, then user prompted

### Logging
- All actions logged to `logs/execution.log`
- Timestamps on every log entry
- Searchable by step name or action type

### Screenshots
- Taken before recovery prompt
- Taken after manual action
- Stored in `screenshots/` with descriptive names

## Logging & Debugging

### Log File Location
`logs/execution.log`

### Useful Search Patterns

```bash
# Find all step failures
grep "Step failed" logs/execution.log

# Find all manual recoveries
grep "manual completion" logs/execution.log

# Find all wait triggers
grep "Waiting for" logs/execution.log

# Find all timestamps
grep "\[.*T.*Z\]" logs/execution.log

# See full action trace
grep "ACTION:" logs/execution.log
```

### Screenshot Naming
- `manual-intervention-required-[step-name].png` - When recovery starts
- `after-manual-[step-name].png` - After user completes step

## Key Improvements

### vs. Previous System

| Aspect | Old | New |
|--------|-----|-----|
| **On Error** | Stops/throws | Pauses for recovery |
| **Retries** | 3 attempts auto | 1 attempt + recovery |
| **Skip Option** | Yes | No - all steps required |
| **User Guidance** | Generic | Step-specific |
| **Pause Timeout** | N/A | No timeout |
| **Continue Behavior** | N/A | To next step |
| **Global Recovery** | Yes | Plus individual handlers |

## Testing the System

### To trigger a failure recovery:

1. Start the script normally
2. When approaching a step you want to test:
   - Disable that input field (e.g., `display: none`)
   - Or clear the page element
   - Or modify the DOM to hide the element

3. Watch the script detect the failure
4. Verify recovery prompt appears
5. Complete the action manually
6. Press ENTER
7. Verify automation continues to next step

### Example Test Commands

```bash
# Start automation
npm run full-flow

# In browser console (F12), when ready to test donation amount:
document.querySelectorAll('input[type="number"]').forEach(i => i.disabled = true)

# Watch the script detect failure and show recovery prompt
# Then manually enable it or use the browser to enter the amount
# Press ENTER in the terminal to continue
```

## Common Issues & Solutions

### Issue: Recovery prompt doesn't appear

**Solution:** 
- Check that the browser window is still active
- Verify script isn't stuck in a retry loop
- Check logs: `tail -f logs/execution.log`

### Issue: Script skips to next step too quickly

**Solution:**
- Verify you pressed ENTER
- Check the `handleStepFailure` is being called
- Look for confirmation message in terminal

### Issue: Browser window closes during recovery

**Solution:**
- Browser should stay open throughout
- If closed, script will error
- Rerun from the step that failed

## Integration Points

### Where Recovery is Integrated

1. **Login Phase**
   - Form loading
   - Username field
   - Password field

2. **Donation Phase**
   - Amount field
   - Citizenship checkbox
   - Corpus donation checkbox

3. **Navigation Phase**
   - Continue button finding
   - Continue button clicking
   - Page navigation monitoring

4. **Global Level**
   - Unhandled errors
   - Post-recovery flow decisions

## Advanced Usage

### Customizing Recovery Messages

Edit in `scripts/full-flow.js`, around line 200-236:

```javascript
async function handleStepFailure(stepName, stepDescription, page, browserManager) {
  // Customize the message here
  logger.info(`
What you can do:
  1. Manually complete: ${stepDescription}
  2. Once done, come back here and press ENTER
  3. Automation will continue to the NEXT STEP (not skip)`);
}
```

### Adding Recovery to New Steps

1. Wrap the step logic in try-catch
2. On error, call `handleStepFailure()`
3. Continue with next step after recovery
4. Log the recovery action

Example:
```javascript
try {
  // Step logic here
  doSomething();
} catch (e) {
  logError("Step description", { error: e.message });
  await handleStepFailure(
    "Step Name",
    "Description of what user should do",
    page,
    browserManager
  );
  // Continue to next step
}
```

## Version History

- **v1.0** - Initial implementation
  - Universal failure handler
  - 9 protected steps
  - Full logging system
  - Screenshot capture
  - No timeout pauses
  - Continue to next step

## Support & Issues

For issues or questions:
1. Check the logs: `logs/execution.log`
2. Review screenshots: `screenshots/` directory
3. Refer to: `FAILURE_RECOVERY_IMPLEMENTATION.md`
4. Check flowchart: `STEP_RECOVERY_FLOW.txt`

---

**Status:** ✅ Production Ready
**Last Updated:** July 26, 2026
**Verified:** Yes - syntax validated, tested in browser

