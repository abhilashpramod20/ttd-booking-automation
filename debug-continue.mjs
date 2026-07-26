// Debug script to test Continue button click behavior

import { chromium } from 'playwright';

(async () => {
  console.log('Starting debug script for Continue button...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.createContext();
  const page = await context.newPage();

  try {
    // Navigate and login
    console.log('1. Navigating to TTD website...');
    await page.goto('https://tirupatibalaji.ap.gov.in/#/userLogin');
    await page.waitForTimeout(3000);

    // Fill login form
    console.log('2. Filling login credentials...');
    await page.fill('[name="uName"]', 'abhilash.pramod@yahoo.com');
    await page.fill('[name="pwd"]', 'F@natics2025');
    await page.waitForTimeout(1000);

    // Handle CAPTCHA (manual)
    console.log('3. Please solve CAPTCHA manually and click Login');
    console.log('   The browser is open - complete login manually');
    await page.waitForNavigation({ timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // Navigate to donation page
    console.log('4. Navigating to donation confirmation page...');
    await page.goto('https://tirupatibalaji.ap.gov.in/#/SrivaniDonationConfirm');
    await page.waitForTimeout(3000);

    // Check page content
    console.log('5. Analyzing page after load...\n');
    
    const pageContent = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const continueBtn = buttons.find(b => b.textContent.includes('Continue'));
      
      return {
        hasButtons: buttons.length,
        buttons: buttons.map(b => ({
          text: b.textContent.trim(),
          class: b.className,
          onclick: b.onclick ? 'yes' : 'no',
          ngClick: b.getAttribute('ng-click')
        })),
        continueFound: !!continueBtn,
        continueBtnDetails: continueBtn ? {
          text: continueBtn.textContent,
          class: continueBtn.className,
          onclick: continueBtn.onclick ? 'yes' : 'no',
          ngClick: continueBtn.getAttribute('ng-click'),
          ngDisabled: continueBtn.getAttribute('ng-disabled'),
          isClickable: continueBtn.offsetParent !== null
        } : null
      };
    });

    console.log('Page Analysis:');
    console.log(JSON.stringify(pageContent, null, 2));

    // Try clicking the button with different strategies
    console.log('\n6. Attempting to click Continue button...\n');

    const continueButton = page.locator('button:has-text("Continue")');
    const exists = await continueButton.count();
    
    if (exists > 0) {
      console.log('✓ Continue button found');
      
      // Get button details before click
      const beforeClick = await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continue'));
        return {
          isVisible: !!btn && btn.offsetParent !== null,
          disabled: btn ? btn.disabled : 'button not found',
          ngDisabled: btn ? btn.getAttribute('ng-disabled') : 'button not found'
        };
      });
      console.log('Before click:', JSON.stringify(beforeClick, null, 2));

      // Strategy 1: Playwright click
      console.log('\nStrategy 1: Playwright click()...');
      try {
        await continueButton.click();
        console.log('✓ Click executed');
      } catch (e) {
        console.log('✗ Click failed:', e.message);
      }

      // Wait and check URL
      console.log('\nWaiting for page change (5 seconds)...');
      await page.waitForTimeout(5000);
      
      const urlAfter = page.url();
      console.log('URL after click:', urlAfter);

      if (urlAfter !== 'https://tirupatibalaji.ap.gov.in/#/SrivaniDonationConfirm') {
        console.log('✓ PAGE NAVIGATED SUCCESSFULLY!');
      } else {
        console.log('✗ PAGE DID NOT NAVIGATE');
        
        // Check for form errors
        const errors = await page.evaluate(() => {
          const alerts = Array.from(document.querySelectorAll('[role="alert"], .error, .alert, .ng-invalid'));
          return alerts.map(a => a.textContent.trim()).slice(0, 5);
        });
        
        if (errors.length > 0) {
          console.log('\nFound error messages:');
          errors.forEach((err, i) => console.log(`  ${i+1}. ${err}`));
        }

        // Try other strategies
        console.log('\nStrategy 2: JavaScript click...');
        await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continue'));
          if (btn) btn.click();
        });
        await page.waitForTimeout(5000);
        console.log('URL after JS click:', page.url());

        // Try Angular form submission
        console.log('\nStrategy 3: Angular form submit...');
        const submittedNG = await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Continue'));
          if (btn && btn.getAttribute('ng-click')) {
            const ngClick = btn.getAttribute('ng-click');
            btn.click();
            return { ngClick, clicked: true };
          }
          return null;
        });
        console.log('Angular submission result:', JSON.stringify(submittedNG, null, 2));
        await page.waitForTimeout(5000);
        console.log('URL after Angular:', page.url());
      }
    } else {
      console.log('✗ Continue button NOT found');
    }

    console.log('\n7. Taking final screenshot...');
    await page.screenshot({ path: '/Users/abpramod/ttd-booking-automation/screenshots/debug-continue-final.png' });
    console.log('✓ Screenshot saved');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    console.log('\nDone. Closing browser...');
    await browser.close();
  }
})();
