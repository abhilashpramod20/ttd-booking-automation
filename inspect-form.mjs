import { chromium } from 'playwright';

const config = {
  credentials: {
    email: 'abhilash.pramod@yahoo.com',
    password: 'F@natics2025'
  },
  baseUrl: 'https://tirupatibalaji.ap.gov.in'
};

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('1. Logging in...');
    await page.goto(config.baseUrl + '/#/userLogin');
    await page.waitForTimeout(2000);
    
    await page.fill('[name="uName"]', config.credentials.email);
    await page.fill('[name="pwd"]', config.credentials.password);
    await page.waitForTimeout(1000);
    
    console.log('2. MANUAL: Solve CAPTCHA and click Login');
    
    // Wait for navigation after login
    await page.waitForNavigation({ timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(3000);

    console.log('3. Navigating to donation page...');
    await page.goto(config.baseUrl + '/#/SrivaniDonationConfirm');
    await page.waitForTimeout(3000);

    console.log('\n4. Analyzing form structure...\n');
    
    const formData = await page.evaluate(() => {
      const result = {
        inputs: [],
        buttons: [],
        checkboxes: [],
        hasForm: !!document.querySelector('form'),
        bodyContent: document.body.innerHTML.substring(0, 500)
      };

      // All inputs
      document.querySelectorAll('input').forEach(inp => {
        result.inputs.push({
          type: inp.type,
          name: inp.name,
          id: inp.id,
          placeholder: inp.placeholder,
          value: inp.value,
          required: inp.required,
          ngModel: inp.getAttribute('ng-model'),
          visible: inp.offsetParent !== null
        });
      });

      // All checkboxes
      document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        result.checkboxes.push({
          name: cb.name,
          id: cb.id,
          checked: cb.checked,
          ngModel: cb.getAttribute('ng-model'),
          visible: cb.offsetParent !== null,
          label: cb.parentElement?.textContent || 'N/A'
        });
      });

      // All buttons
      document.querySelectorAll('button').forEach(btn => {
        result.buttons.push({
          text: btn.textContent.trim(),
          type: btn.type,
          ngClick: btn.getAttribute('ng-click'),
          ngDisabled: btn.getAttribute('ng-disabled'),
          disabled: btn.disabled,
          visible: btn.offsetParent !== null
        });
      });

      return result;
    });

    console.log('=== FORM STRUCTURE ===');
    console.log('Has <form>:', formData.hasForm);
    
    console.log('\n=== INPUTS (' + formData.inputs.length + ') ===');
    formData.inputs.forEach((inp, i) => {
      console.log(`${i+1}. ${inp.type}: name=${inp.name}, visible=${inp.visible}, required=${inp.required}, ngModel=${inp.ngModel}`);
    });

    console.log('\n=== CHECKBOXES (' + formData.checkboxes.length + ') ===');
    formData.checkboxes.forEach((cb, i) => {
      console.log(`${i+1}. ${cb.label}: checked=${cb.checked}, visible=${cb.visible}, ngModel=${cb.ngModel}`);
    });

    console.log('\n=== BUTTONS (' + formData.buttons.length + ') ===');
    formData.buttons.forEach((btn, i) => {
      console.log(`${i+1}. "${btn.text}" (${btn.type}): visible=${btn.visible}, disabled=${btn.disabled}, ngClick=${btn.ngClick}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    console.log('\nClosing browser in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
})();
