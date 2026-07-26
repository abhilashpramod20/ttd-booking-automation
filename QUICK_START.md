# Quick Start Guide

## 5-Minute Setup

### 1. Clone/Download the Project

```bash
cd ttd-booking-automation
```

### 2. Install Dependencies

```bash
npm install
```

This installs Playwright and other required packages (~150MB).

### 3. Configure Your Credentials

```bash
cp config/config.example.js config/config.js
```

Edit `config/config.js` with your details:

```javascript
export default {
  username: "your_email@example.com",    // Your TTD login
  password: "your_password",              // Your TTD password
  headless: false,                        // Keep browser visible
  slowMo: 1000,                          // Slow down (ms)
  // ... other options
};
```

### 4. Run Your First Script

#### Option A: Login Only (Test)

```bash
npm run login
```

This will:
1. Open your browser
2. Navigate to TTD login page
3. Ask for your approval at each step
4. Fill in and submit credentials
5. Keep browser open so you can verify

**Expected prompts:**
```
Ready to proceed? (yes/no): yes
[fills form]
Ready to proceed? (yes/no): yes
[submits]
✓ Login successful!
```

#### Option B: Full Booking Flow

```bash
npm run full-flow
```

Runs login → booking in sequence with manual approval at each step.

#### Option C: Interactive Mode

```bash
npm run interactive
```

Step-by-step guide with explanations.

## Understanding the Process

### What "Guided" Means

Each script **pauses and waits for your approval** before taking action:

```
✓ Step: Fill Login Form
📋 Details: Username field filled with: user@example.com
✓ Browser shows: Login form with password field visible

Ready to proceed? (yes/no): _
```

**You must type `yes`** to continue. This means:
- ✅ You control every action
- ✅ You can see what's happening in real-time
- ✅ No hidden automation
- ✅ Easy to stop if something goes wrong

### Key Features

| Feature | What It Does |
|---------|-------------|
| **Screenshots** | Saves images of each step in `screenshots/` folder |
| **Error Handling** | If something fails, saves error screenshot automatically |
| **Logging** | Detailed logs saved to `logs/execution.log` |
| **Manual Approval** | You approve every critical action |
| **Transparent** | See exactly what the browser is doing |

## Workflow

### Login Script (`npm run login`)

```
1. Opens browser with TTD website
   ↓ (You approve)
2. Fills username field
   ↓ (You approve)
3. Fills password field
   ↓ (You approve)
4. Clicks login button
   ↓ (Waits for authentication)
5. Shows success message
   ↓
6. Browser stays open
```

### Booking Script (`npm run book`)

```
1. Opens TTD website (assumes logged in)
   ↓ (You approve)
2. Navigates to booking section
   ↓ (You choose manual or guided)
3. Shows available dates
   ↓ (You select in browser)
4. Shows booking form
   ↓ (You review details)
5. Submits booking
   ↓ (Waits for confirmation)
6. Shows success
```

## Troubleshooting

### "Browser hangs waiting for approval"

This is normal! The script is **paused waiting for your input**. Type `yes` or `no` in the terminal.

### "Element not found" Error

The website structure may have changed. Check the error screenshot in `screenshots/` folder and manually navigate instead.

### "Username field not found"

The form selectors need updating. This happens when the website updates its HTML. Run `npm run interactive` and manually complete the steps instead.

### Browser closes unexpectedly

If Playwright crashes:
1. Check if port is already in use
2. Increase `slowMo` value in config to `2000`
3. Increase `timeout` to `60000`

### Password not being filled

Some websites block automated typing. Solution:
1. Set `slowMo: 2000` for slower input
2. Or manually type password when prompted

## File Structure Reference

```
ttd-booking-automation/
├── scripts/
│   ├── login.js              ← Login automation
│   ├── book-tickets.js       ← Booking automation
│   ├── full-flow.js          ← Both combined
│   ├── interactive.js        ← Interactive guide
│   └── utils/
│       ├── browser.js        ← Playwright setup
│       ├── logger.js         ← Logging system
│       └── prompts.js        ← Approval prompts
├── config/
│   ├── config.example.js     ← Template (COPY THIS)
│   └── config.js             ← Your config (IN .gitignore)
├── screenshots/              ← Error/progress screenshots
├── logs/                     ← Execution logs
├── package.json              ← Dependencies
└── README.md                 ← Full documentation
```

## Environment Variables (Optional)

Instead of editing `config.js`, you can use `.env`:

```bash
cat > .env << EOF
TTD_USERNAME=your_email@example.com
TTD_PASSWORD=your_password
EOF
```

Then modify scripts to read these variables. Current implementation uses `config/config.js` directly.

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Login fails | Verify credentials work manually first |
| Browser won't open | Install Chromium: `npx playwright install` |
| "Port already in use" | Close other Chrome/Chromium instances |
| Timeout on slow network | Increase `timeout` to `60000` in config |
| Can't read password field | Use interactive mode and type manually |

## Next Steps

1. **Run login first**: `npm run login`
2. **Verify you're logged in**: Check browser window
3. **Run booking**: `npm run book`
4. **Verify confirmation**: Check for booking details

## Important Reminders

⚠️ **Keep credentials private**: Never commit `config/config.js` to git

⚠️ **One browser at a time**: Each script opens its own browser

⚠️ **Close manually**: Browser stays open after script finishes - close it when done

⚠️ **Manual approval required**: Every significant step needs your approval - this is a feature, not a limitation!

## Getting Help

If something fails:

1. **Check the screenshot**: Look in `screenshots/` folder
2. **Read the logs**: Check `logs/execution.log`
3. **Try interactive mode**: `npm run interactive`
4. **Manually verify**: Navigate manually using the browser to test the steps

## Success Indicators

✅ Browser opens and shows TTD website
✅ You see approval prompts in terminal
✅ Screenshots are saved after each step
✅ You can control the pace and approve each action
✅ Error messages include screenshot references

You're all set! Run `npm run login` to start.
