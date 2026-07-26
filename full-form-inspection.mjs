import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('\n=== STEP 1: FULL LOGIN FLOW ===\n');
    await page.goto('https://tirupatibalaji.ap.gov.in/#/userLogin');
    await page.waitForTimeout(2000);
    
    await page.fill('[name="uName"]', 'abhilash.pramod@yahoo.com');
    await page.fill('[name="pwd"]', 'F@natics2025');
    
    console.log('⏳ PLEASE: Solve CAPTCHA and click Login button');
    console.log('   (Waiting up to 60 seconds...)\n');
    
    // Wait for actual navigation
    await Promise.race([
      page.waitForNavigation({ timeout: 60000, waitUntil: 'domcontentloaded' }),
      new Promise(r => setTimeout(r, 60000))
    ]).catch(() => {});
    
    await page.waitForTimeout(3000);
    const urlAfterLogin = page.url();
    console.log('✓ After login, URL:', urlAfterLogin);

    if (urlAfterLogin.includes('userLogin')) {
      console.log('❌ Login failed - still on login page');
      console.log('⏳ Waiting 10 more seconds in case page is loading...');
      await page.waitForTimeout(10000);
    }

    console.log('\n=== STEP 2: NAVIGATING TO DONATION PAGE ===\n');
    console.log('Current URL before navigation:', page.url());
    
    await page.goto('https://tirupatibalaji.ap.gov.in/#/SrivaniDonationConfirm', {
      waitUntil: 'domcontentloaded'
    });
    
    await page.waitForTimeout(3000);
    console.log('✓ After navigation to donation page, URL:', page.url());

    console.log('\n=== STEP 3: PAGE CONTENT ANALYSIS ===\n');
    
    const pageAnalysis = await page.evaluate(() => {
      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      const buttons = Array.from(document.querySelectorAll('button'));
      const visibleButtons = buttons.filter(b => b.offsetParent !== null);
      const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="number"]'));
      
      return {
        url: window.location.href,
        title: document.title,
        hasCheckboxes: checkboxes.length,
        checkboxes: checkboxes.map(cb => ({
          text: cb.parentElement?.textContent?.trim().substring(0, 50),
          ngModel: cb.getAttribute('ng-model'),
          checked: cb.checked,
          visible: cb.offsetParent !== null
        })),
        buttons: visibleButtons.map(b => ({
          text: b.textContent.trim(),
          ngClick: b.getAttribute('ng-click'),
          ngDisabled: b.getAttribute('ng-disabled'),
          disabled: b.disabled
        })),
        inputs: inputs.map(i => ({
          type: i.type,
          placeholder: i.placeholder,
          value: i.value,
          ngModel: i.getAttribute('ng-model'),
          visible: i.offsetParent !== null
        })),
        pageText: document.body.innerText.substring(0, 1000)
      };
    });

    console.log('Checkboxes found:', pageAnalysis.hasCheckboxes);
    pageAnalysis.checkboxes.forEach((cb, i) => {
      console.log(`  ${i+1}. ${cb.text} (ngModel: ${cb.ngModel}, checked: ${cb.checked})`);
    });

    console.log('\nVisible buttons:');
    pageAnalysis.buttons.forEach((btn, i) => {
      console.log(`  ${i+1}. "${btn.text}" (ngClick: ${btn.ngClick})`);
    });

    console.log('\nText inputs:');
    pageAnalysis.inputs.forEach((inp, i) => {
      console.log(`  ${i+1}. ${inp.placeholder || inp.ngModel || inp.type} (visible: ${inp.visible})`);
    });

    console.log('\n=== STEP 4: PAGE TEXT SAMPLE ===\n');
    console.log(pageAnalysis.pageText.substring(0, 500));

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    console.log('\n\nClosing in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();
