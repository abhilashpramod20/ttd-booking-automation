import { chromium } from 'playwright';
import { logger } from './utils/logger.js';

async function debugSelectors() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://tirupatibalaji.ap.gov.in/#/SrivaniDonationConfirm', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('ALL INPUT ELEMENTS:');
    logger.info('═══════════════════════════════════════════════════════════════');

    const inputs = await page.evaluate(() => {
      const inputElements = document.querySelectorAll('input');
      const result = [];
      inputElements.forEach((el, index) => {
        result.push({
          index,
          type: el.type,
          html: el.outerHTML,
          id: el.id,
          name: el.name,
          'ng-model': el.getAttribute('ng-model'),
          value: el.value,
          checked: el.checked,
          parentText: el.parentElement.textContent.trim().substring(0, 100)
        });
      });
      return result;
    });

    inputs.forEach(inp => {
      logger.info(`Input ${inp.index}: type="${inp.type}"`);
      logger.info(`  HTML: ${inp.html.substring(0, 200)}`);
      logger.info(`  ID: ${inp.id}, Name: ${inp.name}, ng-model: ${inp['ng-model']}`);
      logger.info(`  Value: ${inp.value}, Checked: ${inp.checked}`);
      logger.info(`  Parent text: ${inp.parentText}`);
      logger.info('');
    });

    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('BUTTONS WITH TEXT "Continue" or similar:');
    logger.info('═══════════════════════════════════════════════════════════════');

    const buttons = await page.evaluate(() => {
      const buttonElements = document.querySelectorAll('button');
      const result = [];
      buttonElements.forEach((el, index) => {
        const text = el.innerText.trim().toLowerCase();
        if (text.includes('continue') || text.includes('reset') || text.includes('current') || text.includes('booking') || text.includes('advance')) {
          result.push({
            index,
            html: el.outerHTML,
            text: el.innerText.trim(),
            class: el.className,
            'ng-click': el.getAttribute('ng-click'),
            type: el.type
          });
        }
      });
      return result;
    });

    buttons.forEach(btn => {
      logger.info(`Button: "${btn.text}"`);
      logger.info(`  HTML: ${btn.html}`);
      logger.info(`  Class: ${btn.class}`);
      logger.info(`  ng-click: ${btn['ng-click']}`);
      logger.info('');
    });

    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('LOOKING FOR CHECKBOX-LIKE ELEMENTS:');
    logger.info('═══════════════════════════════════════════════════════════════');

    const checkboxLike = await page.evaluate(() => {
      // Look for elements with checkbox styling
      const result = [];
      
      // Look for spans/divs with checkmark-like content
      document.querySelectorAll('[ng-model], [ng-click*="check"]').forEach((el, idx) => {
        result.push({
          tag: el.tagName,
          html: el.outerHTML.substring(0, 300),
          innerText: el.innerText?.substring(0, 100) || 'none',
          'ng-model': el.getAttribute('ng-model'),
          'ng-click': el.getAttribute('ng-click'),
          classes: el.className
        });
      });
      
      return result;
    });

    checkboxLike.slice(0, 10).forEach((el, idx) => {
      logger.info(`Element ${idx}:`);
      logger.info(`  Tag: ${el.tag}, Classes: ${el.classes}`);
      logger.info(`  HTML: ${el.html}`);
      logger.info(`  ng-model: ${el['ng-model']}, ng-click: ${el['ng-click']}`);
      logger.info('');
    });

  } catch (error) {
    logger.error(`Error: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

debugSelectors();
