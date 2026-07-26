# CAPTCHA Handling - TTD Login Automation

## Overview

The TTD login page includes a CAPTCHA (Completely Automated Public Turing test to tell Computers and Humans Apart) that changes on every page load. This document explains how the system handles it.

## Why Manual CAPTCHA Entry?

CAPTCHAs are specifically designed to:
- Prevent automated access
- Verify human presence
- Change on every attempt
- Cannot be reliably solved programmatically

Our system respects this by **requiring manual entry** while automating everything else.

## How It Works

### Flow

1. **Browser Opens** → TTD website loads
2. **Credentials Auto-Fill** → Username & password entered automatically
3. **CAPTCHA Detected** → System pauses and takes screenshot
4. **Manual Entry** → You read CAPTCHA from screen and enter code
5. **Form Submitted** → System clicks Login button
6. **Result** → Success or error message

### Visual Example

```
[Browser Opens]
     ↓
[Load TTD Login Page]
     ↓
[Email & Password Auto-Filled]
     ↓
[CAPTCHA Image Appears on Screen]
     ↓
[System Takes Screenshot: 04-captcha-visible.png]
     ↓
⚠️ [System Pauses and Asks You]
   "Enter the CAPTCHA code from the browser"
   You type: WSMQVXA
     ↓
[System Fills CAPTCHA Field]
     ↓
[Takes Screenshot: 05-captcha-filled.png]
     ↓
[Asks for Final Approval]
   "Ready to submit?" 
   You type: yes
     ↓
[Clicks Login Button]
     ↓
[Waits for Authentication]
     ↓
✅ [Login Success]
```

## Step-by-Step Usage

### 1. Start the Login Script

```bash
cd /Users/abpramod/ttd-booking-automation
npm run login
```

### 2. You'll See First Prompt

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Step: Fill Login Form
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Details:
The login form is ready. We'll now fill in your credentials.

Ready to proceed? (yes/no): 
```

**Type:** `yes`

### 3. Browser Shows CAPTCHA

The script will:
- Fill in your email automatically
- Fill in your password automatically  
- Show you the browser window with CAPTCHA visible
- Take a screenshot: `04-captcha-visible.png`

You'll see a prompt in the terminal:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Enter CAPTCHA Code
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  A CAPTCHA code is required!
Look at the CAPTCHA image in the browser window.
It shows random letters/numbers that keep changing.

Hint: Example: WSMQVXA (case doesn't matter, we'll convert to uppercase)

Enter value: 
```

### 4. Read CAPTCHA from Browser

Look at the **browser window** that opened. You'll see the CAPTCHA image showing random letters/numbers.

### 5. Type the Code

Enter the CAPTCHA code in the terminal where prompted:

```
Enter value: WSMQVXA
```

The system will:
- ✅ Convert to uppercase automatically
- ✅ Fill the CAPTCHA field
- ✅ Take screenshot: `05-captcha-filled.png`

### 6. Final Submission

You'll get another prompt:

```
Step: Submit Login Form
Ready to proceed? (yes/no): yes
```

**Type:** `yes`

The system will:
- Click the Login button
- Wait for authentication
- Show success/error message

## Screenshots for Reference

The system saves screenshots at key points:

```
screenshots/
├── 01-login-form-ready.png         # Form loaded
├── 02-username-filled.png          # Email entered
├── 03-password-filled.png          # Password entered
├── 04-captcha-visible.png          # ⭐ CAPTCHA shown here
├── 05-captcha-filled.png           # CAPTCHA entered
├── 06-login-submitted.png          # Form submitted
├── 07-after-login.png              # After login
└── error-*.png                     # If errors occur
```

**Tip:** If you're not sure what CAPTCHA code to enter, check screenshot `04-captcha-visible.png` - it shows exactly what appeared on the screen.

## Common Issues & Solutions

### Issue: Can't See CAPTCHA Code Clearly

**Solution:**
1. Look at your **browser window** (not terminal)
2. The CAPTCHA is displayed as text image in the login form
3. Read each letter/number carefully
4. Look at screenshot `04-captcha-visible.png` for reference

### Issue: Made a Typo in CAPTCHA

**What happens:**
- System fills the wrong code
- Login fails with error message
- Browser shows error from TTD

**Solution:**
- Close the browser
- Run `npm run login` again
- You'll get a fresh CAPTCHA to try again

### Issue: CAPTCHA Code Changed

**This is normal!** CAPTCHAs refresh on every:
- Page reload
- Wrong submission attempt
- Browser navigation change

**What to do:**
- Wait for new CAPTCHA to appear
- Read the new code
- Enter the new code
- Try again

### Issue: "CAPTCHA field not found"

**What it means:** TTD website structure may have changed

**Solution:**
1. Check if the website layout is different
2. Use `npm run interactive` mode instead
3. Manually complete the form in browser
4. Report this in logs

## Technical Details

### CAPTCHA Field Selectors

The system looks for CAPTCHA using multiple selectors:

```javascript
'[name="txtInput"]'              // Primary selector (works)
'[placeholder*="Captcha"]'       // Placeholder contains "Captcha"
'input[ng-model*="cha"]'         // AngularJS ng-model
```

### CAPTCHA Validation

The system:
- ✅ Accepts uppercase/lowercase (auto-converts to uppercase)
- ✅ Trims whitespace automatically
- ✅ Validates field exists before attempting
- ✅ Handles missing CAPTCHA gracefully

### Why Not Automatic?

**Could we solve CAPTCHA automatically?**

**No, because:**
1. **Anti-OCR protection** - TTD's CAPTCHA is distorted to prevent OCR
2. **Website terms** - Automated solving violates TTD ToS
3. **Fairness** - CAPTCHA ensures fair access
4. **Reliability** - Manual entry is 100% reliable
5. **Legality** - CAPTCHA solving services may be legal gray area

**Our approach is better:**
- Respects website intent
- Maintains full control
- 100% success rate
- Completely transparent
- Legally compliant

## Tips for Success

### 1. **Take Your Time**
- Don't rush when reading CAPTCHA
- Make sure you're reading letters correctly
- Check each character before typing

### 2. **Common Mistakes**
```
❌ Confusing:
   - O (letter O) vs 0 (zero)
   - I (capital i) vs l (lowercase L) vs 1 (one)
   - S (letter S) vs 5 (five)

✅ Solution:
   - Read character by character
   - Use context clues
   - Double-check before submitting
```

### 3. **Keep Screenshot Open**
- While typing CAPTCHA, keep browser window visible
- Reference screenshot if needed
- Don't close terminal (keeps browser open)

### 4. **If You Make Mistake**
- System shows clear error message
- Just run the script again
- A new CAPTCHA will appear
- Try again

## Automation Alternatives Considered

| Approach | Pros | Cons |
|----------|------|------|
| **Manual Entry** (Current) | Reliable, legal, simple | Requires human input |
| **OCR Libraries** | Automatic | Fails on TTD's distorted CAPTCHA |
| **CAPTCHA Solving Services** | Automatic | Expensive, violates ToS, unreliable |
| **Headless Browser** | Fast | Can't solve CAPTCHA |
| **Wait & Refresh** | Sometimes works | Unreliable, wastes time |

**We chose manual entry because it's the most reliable and respectful approach.**

## Future Enhancements

If you want to extend this system:

```javascript
// Option 1: Add retry logic
if (captchaAttempt > 3) {
  logger.warn("Too many CAPTCHA failures, giving up");
  process.exit(1);
}

// Option 2: Add clipboard paste support
// Allow user to paste CAPTCHA code instead of typing

// Option 3: Add batch mode
// Process multiple bookings with CAPTCHA queuing
```

## Summary

**The CAPTCHA system:**

✅ Detects CAPTCHA automatically
✅ Takes screenshot for reference
✅ Asks you for the code
✅ Fills it automatically
✅ Submits the form
✅ Handles errors gracefully
✅ Respects website policies

**No manual form filling needed** - except for the CAPTCHA code itself, which cannot and should not be automated.

---

**Status:** ✅ Ready to use
**Last Updated:** 2026-07-26
**Version:** 1.0.0
