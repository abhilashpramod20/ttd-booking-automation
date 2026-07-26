# TTD Booking Automation - Quick Start Guide

## Prerequisites

### 1. System Requirements
- macOS (tested on Sonoma)
- Node.js 18+ installed
- Tesseract OCR installed via Homebrew

### 2. Install Tesseract OCR
```bash
brew install tesseract
```

Verify installation:
```bash
tesseract --version
```

### 3. Install Node Dependencies
```bash
cd /Users/abpramod/ttd-booking-automation
npm install
```

---

## Step-by-Step: Running the Full Flow

### Step 1: Open Terminal
```bash
# Navigate to project directory
cd /Users/abpramod/ttd-booking-automation
```

### Step 2: Verify Configuration
Check that `config/config.js` has correct credentials:
```bash
cat config/config.js | grep -A 5 "username\|password"
```

Should show:
- `username: "abhilash.pramod@yahoo.com"`
- `password: "F@natics2025"`

### Step 3: Run the Full Flow Script
```bash
npm run full-flow
```

### Step 4: Watch the Script Execute

The script will:

**Phase 1: LOGIN (~ 15 seconds)**
1. Navigate to login page
2. Fill username
3. Fill password
4. **Automatically recognize CAPTCHA via OCR**
5. Click Login button
6. Wait for authentication

**Phase 2: DONATION (~ 10 seconds)**
1. Navigate to donation page
2. Fill donation amount (₹10000)
3. Check "Corpus Donation" checkbox
4. Check "Indian Citizenship" checkbox
5. Click "Continue" button
6. Wait for booking page

**Total Runtime: ~25-30 seconds**

---

## What You'll See

### Console Output
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TTD COMPLETE AUTOMATION FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[timestamp] [INFO] Login + Donation + Booking (automated)
[timestamp] [SUCCESS] Browser launched successfully
...
[timestamp] [SUCCESS] ✓ CAPTCHA recognized via OCR: DWGV4AW
[timestamp] [SUCCESS] ✓ Login process completed!
[timestamp] [SUCCESS] ✓ Donation flow completed successfully!
```

### Screenshots Captured
Automatically saved to `screenshots/` directory:
- `01-login-form-ready.png`
- `02-username-filled.png`
- `03-password-filled.png`
- `04-captcha-visible.png` (shows actual CAPTCHA)
- `05-captcha-filled.png`
- `06-login-submitted.png`
- `07-after-login.png`
- `08-donation-form-ready.png`
- `09-donation-amount-filled.png`
- `10-checkbox1-checked.png`
- `11-checkbox2-checked.png`
- `12-before-continue-click.png`
- `13-after-continue-click.png`
- `15-no-booking-button.png`

### Logs
Detailed execution logs saved to:
```bash
cat logs/execution.log
```

---

## Troubleshooting

### Issue: "CAPTCHA recognition failed"
**Cause:** OCR could not recognize the CAPTCHA image
**Solution:**
1. Check screenshot: `cat screenshots/04-captcha-visible.png`
2. Verify Tesseract is installed: `tesseract --version`
3. Run script again - each CAPTCHA is different

### Issue: "Donation field not found"
**Cause:** Page layout changed or field selector needs update
**Solution:**
1. Check screenshot: `cat screenshots/08-donation-form-ready.png`
2. Page may have loaded but not fully rendered
3. Script will retry

### Issue: "Timeout waiting for element"
**Cause:** Page taking too long to load
**Solution:**
1. Check internet connection
2. Website may be under maintenance
3. Run script again in a few moments

### Issue: Browser doesn't close
**Cause:** Script keeps browser open for manual verification
**Solution:**
```bash
# Option 1: Close browser window manually
# Option 2: Kill the process
pkill -f "playwright"
```

---

## Individual Scripts (Alternative)

If you prefer to run login and donation separately:

### Login Only
```bash
npm run login
```
Runs: `scripts/login.js`

### Donation Only (if already logged in)
```bash
npm run donate
```
Runs: `scripts/donate.js`

### Full Flow (Recommended)
```bash
npm run full-flow
```
Runs: `scripts/full-flow.js` (login + donation together)

---

## Key Features

✅ **Automatic CAPTCHA Recognition**
- Uses Tesseract.js OCR
- Extracts CAPTCHA image from DOM
- Recognizes new CAPTCHA each run (not cached)

✅ **Zero Manual Intervention**
- Auto-fills all form fields
- Auto-checks all checkboxes
- Auto-clicks all buttons

✅ **Comprehensive Logging**
- Color-coded console output
- Timestamped logs to file
- Screenshot at each step

✅ **Error Handling**
- Graceful failure messages
- Error screenshots captured
- Logs all issues with timestamps

---

## Configuration

Edit `config/config.js` to customize:

```javascript
export default {
  baseUrl: "https://tirupatibalaji.ap.gov.in",
  username: "abhilash.pramod@yahoo.com",
  password: "F@natics2025",
  donation: {
    amount: 10000,                    // ₹ amount
    corpusDonationCheckbox: true,     // 50% treated as corpus
    indianCitizenshipCheckbox: true,  // Indian citizenship
    acceptDeclarations: true          // Accept all declarations
  },
  browser: {
    headless: false,                  // Show browser window
    slowMo: 0                         // Slow down actions (ms)
  }
};
```

---

## Next Steps

After donation completes:
1. Current Booking page should appear (or be available in browser)
2. Select ticket date
3. Enter pilgrim details
4. Complete payment
5. Booking confirmation will appear

For full automation of ticket selection, contact support.

---

## Support

For issues or questions:
1. Check logs: `cat logs/execution.log`
2. Review screenshots in `screenshots/` directory
3. Verify credentials in `config/config.js`
4. Check internet connection and website status

---

**Last Updated:** July 26, 2026
**Status:** ✅ Login + Donation Automation Working
**Next Phase:** Automatic Ticket Booking
