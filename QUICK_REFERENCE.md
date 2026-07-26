# Quick Reference - Running the Script

## ⚡ TL;DR - Just Run This

```bash
cd /Users/abpramod/ttd-booking-automation
npm run full-flow
```

## 📋 What Happens

| Step | What Script Does | What You See |
|------|------------------|--------------|
| 1 | Opens browser | Chrome window opens |
| 2 | Goes to login page | TTD login form |
| 3 | Enters credentials | Username/password filled |
| 4 | Reads CAPTCHA | Either auto-solves or asks you |
| 5 | Logs in | Login submitted |
| 6 | Goes to donation form | Srivani Trust Donation page |
| 7 | Checks Indian Citizenship ✓ | Checkbox marked |
| 8 | Checks Corpus Donation ✓ | Checkbox marked |
| 9 | **Clicks Continue** | Continue button pressed |
| 10 | **Waits for next page** | Should navigate to booking page |

## 💬 When Script Asks for Input

### CAPTCHA Manual Entry
```
CAPTCHA not recognized. Type the code manually:
```
→ Look at CAPTCHA image in browser, type characters, press ENTER

### Login Issues  
```
Login failed. Type 'manual' to handle manually, or 'skip' to skip to donation page
```
→ Type `skip` to jump to donation form (good for testing)

### Page Navigation
```
Continue button was clicked but page didn't navigate. Type 'wait' to wait longer, or 'proceed' to continue anyway
```
→ Type `wait` if page is still loading, or `proceed` to move on

## 📁 Output Files

Check these files after running:

- `screenshots/09-checkbox-checked.png` - Indian checkbox ✓
- `screenshots/09c-corpus-checkbox-checked.png` - Corpus checkbox ✓
- `screenshots/10-before-continue-click.png` - Before clicking Continue
- `screenshots/11-after-continue-click.png` - After clicking Continue (NEW PAGE!)
- `logs/execution.log` - Full detailed trace

## ✅ Success Looks Like This

```
✅ PHASES 1-3 AUTOMATION COMPLETED
✓ Phase 1: Login - COMPLETED
✓ Phase 2: Donation - COMPLETED  
✓ Phase 3: Booking Button - COMPLETED
```

## 🔧 Configuration (Optional)

Edit `config/config.js` to change:
- Donation amount (default: ₹30000)
- Username (default: abhilash.pramod@yahoo.com)
- Password (default: F@natics2025)

## 🚀 The Fix

**Before**: Script stuck after checkboxes, didn't click Continue
**After**: Script clicks Continue and waits up to 10 seconds for page to navigate

## Need Help?

1. Check `logs/execution.log` for detailed trace
2. Look at `screenshots/` to see what's on screen at each step
3. Run the script again - it has retry logic for common failures

That's it! 🎉
