import { chromium } from 'playwright';
import { logger } from './utils/logger.js';
import fs from 'fs';

async function debugSelectors() {
  let browser;
  try {
    logger.info('Starting selector debug...');

    browser = await chromium.launch({
      headless: true
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    logger.info('Navigating to donation page...');
    await page.goto('https://tirupatibalaji.ap.gov.in/#/SrivaniDonationConfirm', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    logger.success('Page loaded. Extracting HTML...');

    // Extract all checkboxes
    const checkboxes = await page.evaluate(() => {
      const checkboxElements = document.querySelectorAll('input[type="checkbox"]');
      const result = [];
      checkboxElements.forEach((el, index) => {
        result.push({
          index,
          html: el.outerHTML,
          id: el.id,
          name: el.name,
          'ng-model': el.getAttribute('ng-model'),
          'data-*': Array.from(el.attributes).filter(a => a.name.startsWith('data-')).map(a => `${a.name}="${a.value}"`).join(' '),
          parentHTML: el.parentElement.outerHTML.substring(0, 300)
        });
      });
      return result;
    });

    // Extract all buttons
    const buttons = await page.evaluate(() => {
      const buttonElements = document.querySelectorAll('button');
      const result = [];
      buttonElements.forEach((el, index) => {
        result.push({
          index,
          html: el.outerHTML,
          text: el.innerText.trim(),
          id: el.id,
          class: el.className,
          'ng-click': el.getAttribute('ng-click'),
          'ng-disabled': el.getAttribute('ng-disabled')
        });
      });
      return result;
    });

    logger.info('');
    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('CHECKBOXES FOUND:');
    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('');
    checkboxes.forEach(cb => {
      logger.info(`Checkbox ${cb.index}:`);
      logger.info(`  HTML: ${cb.html}`);
      logger.info(`  ID: ${cb.id}`);
      logger.info(`  Name: ${cb.name}`);
      logger.info(`  ng-model: ${cb['ng-model']}`);
      logger.info('');
    });

    logger.info('');
    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('BUTTONS FOUND:');
    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('');
    buttons.forEach(btn => {
      logger.info(`Button ${btn.index}: "${btn.text}"`);
      logger.info(`  HTML: ${btn.html.substring(0, 150)}...`);
      logger.info(`  ID: ${btn.id}`);
      logger.info(`  Class: ${btn.class}`);
      logger.info(`  ng-click: ${btn['ng-click']}`);
      logger.info('');
    });

    // Save to JSON for reference
    const output = {
      checkboxes,
      buttons,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync('debug-selectors.json', JSON.stringify(output, null, 2));
    logger.success('Debug info saved to debug-selectors.json');

  } catch (error) {
    logger.error(`Error: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

debugSelectors();
