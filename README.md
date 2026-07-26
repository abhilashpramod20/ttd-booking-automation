# TTD Guided Booking Automation

This is a **guided UI interaction** script for booking Srivani tickets on the Tirumala Tirupati Devasthanams (TTD) website. The script **requires manual approval** at each critical step and does not bypass any website protections.

## Key Features

✅ **Manual Control**: Each major step requires your approval before proceeding
✅ **Transparent Logging**: See exactly what the script is doing
✅ **Error Handling**: Automatic screenshots and detailed error reporting on failures
✅ **Session Management**: Maintains browser session between script runs
✅ **Flexible Workflow**: Login, booking, or run the full flow

## Installation

```bash
npm install
```

This installs:
- **Playwright**: Browser automation framework
- **dotenv**: Environment variable management
- **chalk**: Color-coded console output

## Setup

### 1. Create Configuration File

Copy the template and add your credentials:

```bash
cp config/config.example.js config/config.js
```

Edit `config/config.js` with your TTD account details:

```javascript
export default {
  username: "your_username_or_email",
  password: "your_password",
  headless: false,  // Show browser window
  slowMo: 1000,     // Slow down actions for visibility (milliseconds)
  timeout: 30000,   // Wait up to 30 seconds for elements
  screenshots: true // Save screenshots on errors
};
```

### 2. Create .env File (Optional)

For sensitive data:

```bash
cat > .env << EOF
TTD_USERNAME=your_username
TTD_PASSWORD=your_password
EOF
```

## Usage

### Option 1: Login Only

Test authentication without booking:

```bash
npm run login
```

### Option 2: Book Tickets (Assumes logged in)

Navigate and book Srivani tickets:

```bash
npm run book
```

### Option 3: Full Flow

Complete login → booking flow:

```bash
npm run full-flow
```

### Option 4: Interactive Mode

Step through the process with detailed guidance:

```bash
npm run interactive
```

## How Manual Approval Works

At each critical step, you'll see a prompt like:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Step: Fill Login Form
📋 Details: Username field filled with: user@example.com
✓ Browser shows: Login form with password field visible

Ready to submit login? (yes/no):
```

**You must type "yes" to continue**, giving you complete control.

## What Each Script Does

### `login.js`
1. Opens the TTD website
2. Waits for login page to load
3. Asks for manual approval
4. Fills in username
5. Fills in password
6. Asks for approval before submitting
7. Waits for successful authentication

### `book-tickets.js`
1. Navigates to ticket booking page
2. Looks for Srivani ticket options
3. Asks you to select preferred dates/tickets
4. Shows booking preview
5. Asks for final approval
6. Completes the booking

### `full-flow.js`
Runs both `login.js` and `book-tickets.js` sequentially.

### `interactive.js`
Interactive guide with step-by-step prompts and real-time feedback.

## File Structure

```
ttd-booking-automation/
├── scripts/
│   ├── login.js              # Login flow
│   ├── book-tickets.js       # Booking flow
│   ├── full-flow.js          # Combined flow
│   ├── interactive.js        # Interactive guide
│   └── utils/
│       ├── browser.js        # Playwright setup
│       ├── logger.js         # Logging utilities
│       └── prompts.js        # Manual approval prompts
├── config/
│   ├── config.example.js     # Configuration template
│   └── config.js             # Your actual config (gitignored)
├── screenshots/              # Error screenshots saved here
├── logs/                     # Detailed logs
└── README.md                 # This file
```

## Important Notes

⚠️ **Manual Control Required**: This script DOES NOT automate the entire process. You must approve each step.

⚠️ **Your Credentials**: Stored locally only. Never committed to version control (see `.gitignore`).

⚠️ **Fair Usage**: This script respects rate limiting and booking procedures. It's for personal use only.

⚠️ **Browser Visible**: Runs with visible browser (headless: false) by default so you can see what's happening.

## Troubleshooting

### Script hangs at a prompt
Press Ctrl+C to exit and check the browser window.

### Website element not found
Check `screenshots/` folder for error screenshots. The website structure may have changed.

### Login fails
1. Verify credentials in `config/config.js`
2. Check if your account is locked or needs verification
3. Try logging in manually first to ensure account is accessible

### Browser crashes
Increase `timeout` and `slowMo` values in config.

## Security Best Practices

✅ Keep `config/config.js` in `.gitignore` (credentials never committed)
✅ Don't share `.env` file
✅ Run script only on your personal device
✅ Close script when not in use (browser stays open until you close it)

## Support & Debugging

Enable debug logging:

```bash
DEBUG=* npm run full-flow
```

Check `logs/` directory for detailed execution logs.

## Legal Notice

This tool is intended for **personal use only** with your own account. Respect the TTD website's Terms of Service and booking policies. Use responsibly.
