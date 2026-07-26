import { chromium } from 'playwright';

async function findElements() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://tirupatibalaji.ap.gov.in/#/SrivaniDonationConfirm', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Search for text containing "Corpus Donation"
    const corpusElement = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*')).filter(el => 
        el.textContent.includes('Corpus Donation')
      );
      if (elements.length > 0) {
        return {
          found: true,
          tagName: elements[0].tagName,
          className: elements[0].className,
          html: elements[0].outerHTML.substring(0, 500),
          parent: elements[0].parentElement?.outerHTML.substring(0, 500)
        };
      }
      return { found: false };
    });

    console.log('CORPUS DONATION ELEMENT:');
    console.log(JSON.stringify(corpusElement, null, 2));
    console.log('');

    // Search for "Continue" button
    const continueButton = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).filter(btn => 
        btn.textContent.toLowerCase().includes('continue')
      );
      if (buttons.length > 0) {
        return {
          found: true,
          text: buttons[0].textContent.trim(),
          html: buttons[0].outerHTML,
          className: buttons[0].className,
          id: buttons[0].id
        };
      }
      return { found: false };
    });

    console.log('CONTINUE BUTTON:');
    console.log(JSON.stringify(continueButton, null, 2));

  } catch (error) {
    console.error(`Error: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

findElements();
