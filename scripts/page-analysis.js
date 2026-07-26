import { chromium } from 'playwright';

async function analyze() {
  let browser;
  try {
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('\n📍 Navigating to donation page...\n');
    await page.goto('https://tirupatibalaji.ap.gov.in/#/SrivaniDonationConfirm', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('📍 Page loaded. Now you can:');
    console.log('  1. Right-click on a checkbox → Inspect → Copy HTML');
    console.log('  2. Right-click on Continue button → Inspect → Copy HTML');
    console.log('  3. Right-click on "Current Booking" button → Inspect → Copy HTML');
    console.log('  4. In Console, run: document.body.innerHTML');
    console.log('\n Waiting for manual inspection... (Press Ctrl+C to exit)\n');

    await page.pause();

    console.log('Session ended.');

  } catch (error) {
    console.error(`Error: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

analyze();
