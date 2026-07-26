# TTD Booking Automation - Final Manual Handoff Guide

## What Changed

The script now:
✅ **Completes all automation steps**
✅ **Stops at a clear checkpoint** - "AUTOMATION CHECKPOINT"
✅ **Keeps browser open** - session remains active
✅ **Waits for manual completion** - no timeout
✅ **Lets you complete booking** - at your own pace
✅ **Doesn't kill the session** - browser stays open

---

## Complete Automation Flow

### Phase 1: Login ✅ AUTOMATED
- Navigate to login page
- Enter username & password
- Resolve CAPTCHA (automatic OCR + manual fallback)
- Complete login

### Phase 2: Donation ✅ AUTOMATED
- Wait for donation form to load
- Enter donation amount (₹30,000)
- Check Indian Citizenship checkbox
- Check Corpus Donation checkbox
- Click Continue button

### Phase 3: Page Navigation ✅ AUTOMATED
- Monitor URL change after Continue
- Wait up to 10 seconds for navigation
- If needed, ask user for guidance (wait/manual/proceed)
- Complete navigation to booking page

### Phase 4: Manual Booking ⏸️ HANDOFF TO USER
**Browser is now open and waiting for you to complete:**

1. **Current Booking Button** (if visible)
   - Look for "Current Booking" button
   - Click it to proceed to booking form

2. **Select Darshan Date**
   - Choose your preferred date
   - Check availability
   - Select time slot

3. **Enter Pilgrim Details**
   - Name
   - Age
   - Gender
   - Mobile number
   - Email
   - Address (if required)

4. **Review Booking Summary**
   - Verify all details
   - Check total amount
   - Review darshan timing

5. **Complete Payment**
   - Proceed to payment gateway
   - Enter payment details
   - Complete transaction
   - Get booking confirmation

6. **Confirm Booking**
   - Get confirmation number
   - Note down reference ID
   - Print/save confirmation

---

## When You See the "AUTOMATION CHECKPOINT" Message

The terminal will display:

```
╔═══════════════════════════════════════════════════════════════╗
║ ✅ AUTOMATION CHECKPOINT - ALL AUTOMATED STEPS COMPLETED     ║
║ ✓ All automated steps have been completed successfully!      ║
║ ✓ Browser remains OPEN and ready for manual continuation    ║
╚═══════════════════════════════════════════════════════════════╝

📋 MANUAL STEPS TO COMPLETE
Please complete these steps manually in the browser:
  1. Review the current page
  2. If you see a 'Current Booking' or similar button → Click it
  3. Fill in your darshan date selection
  4. Enter pilgrim details (name, age, gender, mobile, etc.)
  5. Review booking summary
  6. Proceed to payment
  7. Complete payment
  8. Confirm your TTD booking

🔄 NEXT STEPS
The browser window will now stay OPEN indefinitely
Complete your booking manually in the browser
Return to terminal and press ENTER when done

⏸️  WAITING FOR YOU TO COMPLETE BOOKING MANUALLY
Browser is ACTIVE and ready. Complete your booking at your own pace.

Complete your booking in the browser. Press ENTER here when you're DONE with 
the entire booking (after payment confirmation)

Press ENTER when booking is complete: █
```

## What This Means

1. **Browser is still open** ✅
   - Not closed
   - Session is active
   - You can interact with it

2. **Terminal is waiting** ⏸️
   - Terminal shows a prompt
   - Blinking cursor
   - Waiting for your ENTER key

3. **What you do now** 🎯
   - Click buttons in browser manually
   - Fill forms manually
   - Complete payment manually
   - When you're done → Return to terminal

4. **When to press ENTER** ✅
   - **After** you complete the entire booking
   - **After** payment is confirmed
   - **After** you get booking confirmation number
   - Then press ENTER in the terminal

---

## Step-by-Step Instructions

### Step 1: Check the Browser
```
✅ Do this:
   - Look at the TTD website in the browser
   - Check if you're on the booking form page
   - Look for fields to fill (date, pilgrim info, etc.)
   - Or look for a "Current Booking" button to click
```

### Step 2: Complete Booking Fields
```
✅ Do this:
   1. Select darshan date (click calendar/date picker)
   2. Select time slot if available
   3. Enter your name
   4. Enter your age
   5. Select gender
   6. Enter mobile number
   7. Enter email
   8. Enter address (if required)
   9. Review the booking summary
```

### Step 3: Complete Payment
```
✅ Do this:
   1. Click "Proceed to Payment" or similar button
   2. Select payment method (card/UPI/net banking)
   3. Enter payment details
   4. Complete the transaction
   5. Wait for payment confirmation
   6. Get booking confirmation number
```

### Step 4: Save Confirmation
```
✅ Do this:
   1. Note down the booking confirmation number
   2. Save the booking reference ID
   3. Print or screenshot the confirmation page
   4. Note the darshan date and time
```

### Step 5: Return to Terminal
```
✅ Do this:
   1. Go back to your terminal window
   2. Press ENTER key
   3. Script will exit gracefully
   4. Browser will close
```

---

## What If Something Goes Wrong?

### Browser Window Closed
```
❌ Issue: Browser window was accidentally closed
✅ Solution:
   1. Run: npm run full-flow
   2. Script will restart from beginning
   3. You can restart manual booking steps
```

### Can't Find a Button
```
❌ Issue: Can't find "Current Booking" or booking button
✅ Solution:
   1. Look for a menu or navigation
   2. Try clicking "Srivani Donations"
   3. Look for "Continue" or "Proceed" button
   4. Check browser console for any errors
```

### Payment Failed
```
❌ Issue: Payment gateway shows error
✅ Solution:
   1. Check internet connection
   2. Try different payment method
   3. Contact payment gateway support
   4. Try again with correct details
```

### Can't Find Darshan Dates
```
❌ Issue: Date picker showing no available slots
✅ Solution:
   1. Check if dates are sold out
   2. Try different month
   3. Try weekday instead of weekend
   4. Check TTD website for schedule
```

---

## Important Notes

🔔 **Browser Stays Open**
- Do NOT close the browser window
- Session remains active
- You can take breaks and come back

🔔 **Terminal Waits**
- Terminal will show a prompt
- Cursor will be blinking
- Waiting for your ENTER key

🔔 **No Timeout**
- You can take as long as needed
- Script won't force you to hurry
- Complete at your own pace

🔔 **Session Remains Valid**
- All your login info is cached
- Cookies are maintained
- Session won't expire during manual steps

🔔 **When to Press ENTER**
- Only after you complete ENTIRE booking
- After payment confirmation
- After getting confirmation number
- Not before!

---

## Key Differences from Before

| Before | Now |
|--------|-----|
| ❌ Script failed on any error | ✅ Script asks for help |
| ❌ Browser closed on failure | ✅ Browser stays open |
| ❌ Session killed | ✅ Session kept alive |
| ❌ Had to restart entirely | ✅ Can continue from checkpoint |
| ❌ Limited manual intervention | ✅ Full manual handoff |
| ❌ Confusing error messages | ✅ Clear guidance |

---

## Quick Reference

```
Step 1: Run script
        $ npm run full-flow

Step 2: Wait for automation to complete
        (Login → Donation → Navigation)

Step 3: See "AUTOMATION CHECKPOINT" message
        (All automation done)

Step 4: Complete manual booking steps in browser
        (Date → Details → Payment → Confirmation)

Step 5: Press ENTER in terminal
        (Script exits, browser closes)

Done! ✅
```

---

## Logging & Debugging

If something goes wrong, check the logs:

```bash
# View real-time logs
tail -f logs/execution.log

# Search for specific issues
grep "ERROR" logs/execution.log

# See all actions
grep "ACTION:" logs/execution.log

# See all decisions
grep "DECISION:" logs/execution.log
```

---

## Configuration

Settings are in: `config/config.js`

```javascript
{
  username: "your-email@example.com",
  password: "your-password",
  donation: {
    amount: 30000,           // ₹30,000
    corpusDonationCheckbox: true,
    indianCitizenshipCheckbox: true
  }
}
```

---

## Next Run

To run the script again:

```bash
npm run full-flow
```

The script will:
1. Start fresh automation
2. Complete all phases automatically
3. Stop at manual booking handoff
4. Keep browser open
5. Wait for you to complete booking
6. Exit gracefully when you press ENTER

---

## Summary

✅ **Automated:** Login, CAPTCHA, Donation, Navigation
⏸️ **Handed Off:** Booking form, Payment, Confirmation
🔄 **Ready:** Browser open, waiting for manual completion
💾 **Session:** Kept alive, not killed
⏳ **Timeout:** None - take as long as you need

**You're all set! Start the script and complete your TTD booking!**

---

**Last Updated:** July 26, 2026
**Status:** ✅ Production Ready
