# How to Run the TTD Booking Automation (Fixed Version)

## Quick Start

```bash
npm run start
```

## What to Expect

### Phase 1: Login
1. Browser opens automatically
2. Enter CAPTCHA code when you see the image (script can auto-detect sometimes)
3. **IMPORTANT**: When you see the message `"CAPTCHA is visible in the browser. Please solve it if not already done, then click the 'Login' button manually..."`, you need to:
   - Solve the CAPTCHA if not already done
   - Click the **Login button** in the browser
   - Wait for the page to load
   - Come back to the terminal and type `continue` + ENTER

4. After login, you'll see a screenshot of the authenticated page

### Phase 2: Donation Form
1. Script automatically fills:
   - Donation amount: ₹30,000
   - Indian Citizenship checkbox: ✓
   - Corpus Donation checkbox: ✓

2. If the form has validation errors, you'll see:
   ```
   ⚠️  Form has validation errors:
     1. [error message 1]
     2. [error message 2]
   ```
   This tells you what's wrong before clicking Continue

3. Script clicks the **Continue** button

4. Wait for page navigation to booking page

### Phase 3: Booking
1. If a "Current Booking" button appears, script will click it
2. Page transitions to booking form
3. Script stops - **YOU COMPLETE THE BOOKING MANUALLY**
4. When done, type `exit` in the browser console or close it

## Troubleshooting

### "Page didn't navigate after Continue button click"
- Check the validation errors that are displayed
- Look at the browser - are all required fields filled?
- Try clicking Continue manually in the browser
- Type `manual` to let the user take over

### "Still on login page after clicking Login"
- CAPTCHA might be wrong or expired
- Try clicking Login again in the browser
- Or type `manual` to handle it yourself

### "Donation form not loading"
- If stuck on login page, type `skip` to force navigation to donation page
- Otherwise, check browser console for errors

## Key Prompts You'll See

| Prompt | What to Do |
|--------|-----------|
| `"Enter CAPTCHA code manually"` | Look at image in browser, enter the code in terminal |
| `"Please solve it... then click the 'Login' button manually"` | Solve CAPTCHA + Click Login in browser, type `continue` |
| `"Continue button was clicked but page didn't navigate"` | Type `wait`, `manual`, or `proceed` |
| `"Login failed"` | Type `manual` or `skip` |

## Configuration

Edit `config/config.js` to change:
- `username` - Email to login with
- `password` - Password to login with  
- `donation.amount` - Amount to donate (default ₹30,000)
- `donation.corpusDonationCheckbox` - Whether to check corpus checkbox (true/false)

## Logs

All actions are logged to `logs/execution.log` with timestamps. View with:
```bash
tail -f logs/execution.log
```

## Screenshots

Screenshots are saved to `screenshots/` at key steps:
- `01-login-form-ready.png`
- `02-username-filled.png`
- `04-captcha-visible.png`
- `07-after-login.png`
- `08-donation-form-ready.png`
- `09c-corpus-checkbox-checked.png`
- `10-before-continue-click.png`
- `11-after-continue-click.png`
- etc.

## Exit

To stop the script:
1. Press CTRL+C in the terminal, OR
2. Close the browser window, OR
3. Type `exit` when prompted

---
**Version**: 2.0 (Fixed with CAPTCHA manual click + validation checking)
**Last Updated**: July 26, 2026
