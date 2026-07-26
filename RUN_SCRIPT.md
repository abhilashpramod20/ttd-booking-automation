# How to Run the Fixed TTD Booking Automation Script

## Quick Start

```bash
cd /Users/abpramod/ttd-booking-automation
npm run full-flow
```

## What Was Fixed

The script was getting stuck after checking checkboxes because:
1. ❌ OLD: Waiting for "Current Booking" button to appear (5 second timeout)
2. ❌ OLD: Then checking for URL change only as fallback
3. ❌ OLD: If both failed, it would ask for manual intervention

## NEW FLOW (Fixed)

1. ✅ **Click Continue button** - Uses 4-strategy retry logic (always clicks now)
2. ✅ **Wait for page navigation** - Monitors URL change for up to 10 seconds
3. ✅ **If page doesn't navigate** - Asks user to wait longer or proceed anyway
4. ✅ **Look for Next Step** - Searches for "Current Booking" button OR shows current page
5. ✅ **Provide feedback** - Tells you exactly what page you're on

## During Execution

The script will prompt for:

### 1. CAPTCHA Entry
```
CAPTCHA not recognized by OCR. Type CAPTCHA manually:
Example: N8371LU6
```
- Look at the CAPTCHA image on screen in the browser
- Type the characters exactly as shown
- Press ENTER

### 2. If Login Fails
```
Login failed. Type 'manual' to handle manually, or 'skip' to skip to donation page
```
- Type `skip` to jump straight to the donation form (for testing)
- Type `manual` to log in manually in the browser

### 3. After Continue Button Click
```
Continue button was clicked but page didn't navigate. Type 'wait' to wait longer, or 'proceed' to continue anyway
```
- Type `wait` if page is still loading
- Type `proceed` if you want to move forward anyway

## Output Files

- **Screenshots**: `screenshots/` folder (numbered by step)
  - `09-checkbox-checked.png` - Indian Citizenship checkbox
  - `09c-corpus-checkbox-checked.png` - Corpus Donation checkbox
  - `10-before-continue-click.png` - Before Continue button
  - `11-after-continue-click.png` - After Continue button (new page!)
  - `14-after-continue-navigation.png` - Final page state

- **Logs**: `logs/execution.log` (detailed timestamped trace)
  - Search for `ACTION:` to see what happened
  - Search for `ERROR:` if something went wrong

## Success Indicators

✅ Script completed successfully when you see:
```
✅ PHASES 1-3 AUTOMATION COMPLETED
✓ Phase 1: Login - COMPLETED
✓ Phase 2: Donation - COMPLETED
✓ Phase 3: Booking Button - COMPLETED
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| CAPTCHA OCR fails | Enter CAPTCHA manually when prompted |
| Login fails | Type `skip` to test donation form |
| Page doesn't navigate | Type `wait` to give it more time |
| Button won't click | Script will auto-retry 3 times, then ask for manual help |
| Need to debug | Check `screenshots/` and `logs/execution.log` |

