import { chromium } from 'playwright';
import { logger } from './utils/logger.js';

async function inspectDonationPage() {
  let browser;
  try {
    logger.info('Starting Playwright Inspector on Donation Page');
    logger.info('');
    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('INTERACTIVE INSPECTOR - Donation Page');
    logger.info('═══════════════════════════════════════════════════════════════');

    // Launch browser with inspector
    browser = await chromium.launch({
      headless: false,
      devtools: true  // Open DevTools automatically
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    logger.info('Navigating to donation page...');
    await page.goto('https://tirupatibalaji.ap.gov.in/#/SrivaniDonationConfirm', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    logger.success('Donation page loaded. Opening inspector...');
    logger.info('');
    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('INSPECTOR TIPS:');
    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('');
    logger.info('Right-click on elements to inspect them in DevTools');
    logger.info('');
    logger.info('Look for:');
    logger.info('  1. Checkbox selectors (ng-model or id attributes)');
    logger.info('  2. Continue button selector');
    logger.info('  3. Current Booking button selector');
    logger.info('');
    logger.info('In the console, run:');
    logger.info("  document.querySelectorAll('input[type=\"checkbox\"]').forEach((el, i) => console.log(i, el.outerHTML))")
    logger.info("  document.querySelectorAll('button').forEach((el, i) => console.log(i, el.outerHTML))")
    logger.info('');
    logger.info('Press Ctrl+C when done inspecting');
    logger.info('');

    // Enable inspector pause
    await page.pause();

    logger.info('Inspector session ended.');

  } catch (error) {
    if (error.message.includes('Execution context was destroyed')) {
      logger.info('Inspector closed by user.');
    } else {
      logger.error(`Inspector error: ${error.message}`);
    }
  } finally {
    if (browser) {
      await browser.close();
      logger.info('Browser closed.');
    }
  }
}

inspectDonationPage();
