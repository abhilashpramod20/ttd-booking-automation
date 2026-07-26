# Architecture & Technical Details

## System Overview

This is a **guided UI automation framework** for booking TTD Srivani tickets. The key principle is **manual approval at critical steps** - automation handles tedious tasks while you maintain control.

```
┌─────────────────────────────────────────────────────────────┐
│                    User Terminal                             │
│  (Prompts for approval, displays logs, shows status)        │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ↓ (Manual approval required)
┌─────────────────────────────────────────────────────────────┐
│              Guided Automation Layer                         │
│  • Checks conditions  • Takes screenshots                    │
│  • Fills forms       • Handles errors                        │
│  • Navigates pages   • Logs everything                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────────┐
│                  Playwright Browser                          │
│  (Chromium instance - automated interaction)                │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────────┐
│          TTD Website (https://tirupatibalaji.ap.gov.in)     │
│  • Loads pages    • Serves forms    • Processes bookings    │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Browser Manager (`scripts/utils/browser.js`)

Manages the Playwright browser instance.

**Responsibilities:**
- Launch/close browser with configured options
- Navigate to URLs with timeout handling
- Take screenshots on demand or on errors
- Set default timeouts and navigation settings

**Key Methods:**
```javascript
browser.launch()           // Start browser
browser.goto(url)          // Navigate to URL
browser.screenshot(name)   // Save screenshot
browser.takeErrorScreenshot(step) // Save error screenshot
browser.close()            // Close browser
```

**Configuration:**
```javascript
headless: false            // Show browser window
slowMo: 1000              // Slow down actions (ms)
timeout: 30000            // Wait up to 30 seconds
screenshots: true         // Save screenshots
```

### 2. Logger (`scripts/utils/logger.js`)

Comprehensive logging system with colors and file output.

**Log Levels:**
- `debug` - Detailed internal info (use for troubleshooting)
- `info` - General information
- `warn` - Warnings but script continues
- `error` - Errors that may cause failure
- `success` - Successful completion of steps

**Output:**
```
[2024-01-15T10:30:45.123Z] [INFO] Navigating to login page
[2024-01-15T10:30:46.456Z] [SUCCESS] Login form loaded
[2024-01-15T10:30:48.789Z] [ERROR] Element not found: button
```

**Features:**
- Color-coded console output
- Timestamped log files in `logs/`
- Configurable log level

### 3. Prompts (`scripts/utils/prompts.js`)

Interactive prompts for manual approval and user input.

**Functions:**
```javascript
requireApproval(step, details)  // Wait for yes/no
selectFromList(question, opts)  // Multiple choice
enterText(question, hint)       // Text input
prompt(question)                // Single line input
```

**Usage Pattern:**
```javascript
await requireApproval("Fill Login Form", "Ready to fill credentials?");
// User must type "yes" or "no" in terminal
```

## Script Workflows

### Login Script Flow

```
start
  ↓
[navigate to login page]
  ↓
[wait for form to load]
  ↓
⚠️  [requireApproval: "Ready to fill form?"]
  ↓
[fill username field]
  ↓
[fill password field]
  ↓
⚠️  [requireApproval: "Ready to submit?"]
  ↓
[click login button]
  ↓
[wait for dashboard/authentication]
  ↓
[take screenshot]
  ↓
✓ success or ⚠️ verify manually
  ↓
[browser remains open]
  ↓
end
```

### Booking Script Flow

```
start
  ↓
[navigate to TTD website]
  ↓
[check if logged in]
  ↓
⚠️  [requireApproval: "Ready to browse tickets?"]
  ↓
[find Srivani booking link]
  ↓
[click to open booking section]
  ↓
[show available dates]
  ↓
⚠️  [requireApproval: "Ready to select dates?"]
  ↓
[wait for manual date selection in browser]
  ↓
[look for continue button]
  ↓
[navigate to booking form]
  ↓
⚠️  [requireApproval: "Ready to submit booking?"]
  ↓
[click confirm/submit]
  ↓
[wait for confirmation]
  ↓
✓ booking confirmation or ⚠️ verify manually
  ↓
[browser remains open]
  ↓
end
```

## Error Handling

### Strategy

1. **Try to find element**
   - Use multiple selector strategies
   - If not found, log warning

2. **On element interaction**
   - Catch any exceptions
   - Log detailed error
   - Take screenshot

3. **Network timeouts**
   - Wait with configurable timeout
   - Fall back to manual verification
   - Show user what happened

### Error Recovery

```javascript
try {
  await page.goto(url);
} catch (error) {
  logger.error(`Navigation failed: ${error.message}`);
  await browser.takeErrorScreenshot("navigation-error");
  throw error;  // Propagate to caller
}
```

### Screenshots on Error

When an error occurs:
1. Filename: `error-{stepName}-{timestamp}.png`
2. Saved to: `screenshots/`
3. Path logged for user reference

**Example:**
```
error-login-error-2024-01-15T10-30-45-123Z.png
```

## Configuration System

### Config File (`config/config.js`)

```javascript
export default {
  baseUrl: "https://tirupatibalaji.ap.gov.in",
  username: "your_email@example.com",
  password: "your_password",
  
  // Browser behavior
  headless: false,        // false = visible window
  slowMo: 1000,          // milliseconds
  timeout: 30000,        // milliseconds
  screenshots: true,     // enable screenshots
  
  // Booking preferences
  ticketType: "SRIVANI",
  preferredDates: [],
  
  // Logging
  logLevel: "info",
  logToFile: true,
  logFile: "logs/execution.log"
};
```

### Environment Variables (Optional)

Can extend scripts to read from `.env`:

```bash
TTD_USERNAME=your_email@example.com
TTD_PASSWORD=your_password
```

## Selector Strategy

The scripts use multiple selector strategies to find elements:

1. **ng-model selectors** (AngularJS)
   - `[ng-model="loginModel.username"]`
   - Works reliably for AngularJS apps

2. **Text content selectors**
   - `:has-text("Login")`
   - Useful for buttons

3. **Fallback selectors**
   - `button[type='submit']`
   - Generic HTML selectors

4. **nth-of-type**
   - `button:nth-of-type(1)`
   - Last resort

**Why multiple strategies?**
- Website might update structure
- Different form layouts exist
- Improves reliability

## Security Considerations

### Credentials Management

✅ **What we do:**
- Store credentials in `config/config.js` (local only)
- Not commit `config.js` to git (in `.gitignore`)
- Log credentials with asterisks (password hidden)
- No credentials in environment variables (optional)

⚠️ **What you should do:**
- Keep `config/config.js` private
- Don't share project with credentials included
- Delete `.env` if used
- Run script on personal device only

### Data Flow

```
config/config.js (LOCAL)
         ↓
    Browser Form
         ↓
   TTD Website
         ↓
   Authentication
```

No credentials leave your machine except to the TTD website.

## Performance Optimization

### Timeout Values

```javascript
slowMo: 0      // No delay - fastest (may miss elements)
slowMo: 500    // Medium speed (400-600 ms between actions)
slowMo: 1000   // Slow (good for visibility)
slowMo: 2000   // Very slow (debugging)
```

### Navigation Timeout

```javascript
timeout: 10000  // 10 seconds (fast networks)
timeout: 30000  // 30 seconds (default)
timeout: 60000  // 60 seconds (slow networks)
```

### Memory Usage

- Browser instance: ~100MB
- Screenshots: ~1-2MB each
- Logs: ~1-10KB per run

## Logging Output

### Console Output

```
[2024-01-15T10:30:45.123Z] [INFO] Navigating to: https://...
[2024-01-15T10:30:46.456Z] [SUCCESS] Login form loaded
[2024-01-15T10:30:47.789Z] [DEBUG] Found element: button
```

### Log File (`logs/execution.log`)

```
[2024-01-15T10:30:45.123Z] [INFO] Navigating to: https://...
[2024-01-15T10:30:46.456Z] [SUCCESS] Login form loaded
[2024-01-15T10:30:47.789Z] [DEBUG] Found element: button
[2024-01-15T10:30:48.000Z] [INFO] Screenshot saved: screenshots/01-login-form.png
```

## Extensibility

### Adding New Steps

```javascript
import { requireApproval } from "./utils/prompts.js";
import { logger } from "./utils/logger.js";

// Before taking an action
logger.info("Attempting to do X...");
await requireApproval("My New Step", "Details about what we're doing");

// Take action
// ... code here ...

// After action
logger.success("Action completed");
await browserManager.screenshot("step-name.png");
```

### Custom Selectors

Update selector arrays in scripts to match website changes:

```javascript
const selectors = [
  'a:has-text("Srivani")',           // Playwright selectors
  '[href*="srivani"]',               // CSS selectors
  'a[data-test="srivani-link"]'      // Data attributes
];
```

## Dependencies

### Playwright

Modern browser automation library.

**Features:**
- Multiple browser support (Chrome, Firefox, Safari)
- Built-in wait mechanisms
- Screenshot/video recording
- Good error messages

**Alternatives:**
- Selenium (older, more verbose)
- Puppeteer (only Chrome)
- Cypress (UI testing, not automation)

### Chalk

Terminal color library.

**Why:**
- Makes logs readable
- Color-coded by severity
- No security risk

### dotenv

Environment variable loading.

**Optional for:**
- Credentials (if you want)
- Configuration overrides

## Troubleshooting Guide

### Common Issues & Technical Solutions

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Timeout on element | Network slow / Element doesn't exist | Increase `timeout` or check selector |
| Password not typed | Site blocks programmatic input | Use `slowMo: 2000` for human-like speed |
| Browser won't close | Playwright process stuck | Kill with `pkill -f playwright` |
| Memory leak | Too many screenshots | Set `screenshots: false` or clean up old runs |
| Selector fails | Website updated HTML | Update selector array or use interactive mode |

### Debug Mode

```bash
DEBUG=* npm run login
```

This enables:
- Extra console logging
- Detailed Playwright debugging
- Full network trace

### Manual Verification

If script fails:
1. Keep browser open
2. Check screenshot in `screenshots/`
3. Manually navigate to see what's different
4. Update selectors if needed

## Version Information

- **Playwright**: ^1.48.0
- **Node.js**: 18+ required (uses ES modules)
- **Chalk**: ^5.3.0
- **dotenv**: ^16.3.1

## Future Enhancements

Possible improvements:

- [ ] Parallel browser instances (multiple accounts)
- [ ] Scheduling (run at specific times)
- [ ] Email notifications (booking confirmation)
- [ ] Database storage (booking history)
- [ ] Webhook support (external triggers)
- [ ] GUI dashboard (web interface)
- [ ] Screenshot comparison (detect layout changes)
- [ ] CAPTCHA solving (integration ready)

---

**Last Updated:** 2024
**Version:** 1.0.0
**Status:** Production Ready
