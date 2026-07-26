import { createBrowser } from "./utils/browser.js";
import { logger } from "./utils/logger.js";
import { printError, closePrompt, waitForEnter } from "./utils/prompts.js";
import config from "../config/config.js";

async function clickCurrentBooking(page, browserManager) {
  logger.section("Post-Continue Step: Click Current Booking");

  const maxWaitMs = 30000;
  const waitStart = Date.now();

  while (Date.now() - waitStart < maxWaitMs) {
    const currentBookingLocators = [
      page.locator('button:has-text("Current Booking")').first(),
      page.locator('text="Current Booking"').first(),
      page.locator('button[ng-click*="current" i]').first(),
      page.locator('//button[contains(., "Current Booking")]').first(),
      page.locator('button').filter({ hasText: /current\s*booking/i }).first()
    ];

    for (let i = 0; i < currentBookingLocators.length; i++) {
      const locator = currentBookingLocators[i];
      const count = await locator.count().catch(() => 0);
      if (count === 0) {
        continue;
      }

      const visible = await locator.isVisible().catch(() => false);
      if (!visible) {
        continue;
      }

      try {
        await locator.scrollIntoViewIfNeeded().catch(() => null);
        await page.waitForTimeout(200);
        await locator.click({ timeout: 5000, force: true });
        await page.waitForTimeout(2000);
        logger.success("✓ Clicked Current Booking");
        return true;
      } catch (e) {
        logger.warn(`Current Booking click failed (locator ${i}): ${e.message}`);
      }
    }

    const domClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll("button, a"));
      const target = buttons.find((el) =>
        (el.textContent || "").toLowerCase().includes("current booking")
      );
      if (!target) return false;
      target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      return true;
    }).catch(() => false);

    if (domClicked) {
      await page.waitForTimeout(2000);
      logger.success("✓ Clicked Current Booking (DOM fallback)");
      return true;
    }

    await page.waitForTimeout(400);
  }

  logger.warn("⚠️ Could not auto-click Current Booking, switching to manual continuation.");
  return false;
}

async function completeDonationConfirmForm(page, browserManager) {
  logger.section("Post-Donate Step: Fill Amount + Checkboxes + Continue");

  const waitStart = Date.now();
  const maxWaitMs = 30000;
  while (Date.now() - waitStart < maxWaitMs) {
    const currentUrl = page.url();
    if (/srivanidonationconfirm/i.test(currentUrl)) {
      break;
    }
    await page.waitForTimeout(500);
  }

  await page.waitForTimeout(1500);

  const amountValue = "30000";
  const amountCandidates = [
    page.locator('input[ng-model*="amount" i]'),
    page.locator('input[name*="amount" i]'),
    page.locator('input[placeholder*="amount" i]'),
    page.locator('input[type="text"]')
  ];

  let amountFilled = false;
  for (const base of amountCandidates) {
    const count = await base.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      const input = base.nth(i);
      const visible = await input.isVisible().catch(() => false);
      const editable = await input.isEditable().catch(() => false);
      if (!visible || !editable) {
        continue;
      }

      await input.fill("");
      await input.type(amountValue, { delay: 40 });
      await page.waitForTimeout(200);
      const actual = await input.inputValue().catch(() => "");
      if (actual.replace(/\s+/g, "") === amountValue) {
        amountFilled = true;
        logger.success(`✓ Donation amount entered: ${amountValue}`);
        break;
      }
    }
    if (amountFilled) {
      break;
    }
  }

  if (!amountFilled) {
    throw new Error("Could not fill donation amount field");
  }

  const visibleCheckboxes = page.locator('input[type="checkbox"]:visible');
  const checkboxCount = await visibleCheckboxes.count().catch(() => 0);
  if (checkboxCount < 2) {
    throw new Error("Could not find both declaration checkboxes");
  }

  for (let i = 0; i < 2; i++) {
    const cb = visibleCheckboxes.nth(i);
    const checked = await cb.isChecked().catch(() => false);
    if (!checked) {
      await cb.check({ force: true }).catch(async () => {
        await cb.click({ force: true });
      });
    }
    const nowChecked = await cb.isChecked().catch(() => false);
    if (!nowChecked) {
      throw new Error(`Checkbox ${i + 1} could not be checked`);
    }
  }
  logger.success("✓ Both declaration checkboxes checked");

  const continueCandidates = [
    page.locator('button:has-text("Continue")').first(),
    page.locator('button[ng-click*="continue" i]').first(),
    page.locator('text="Continue"').first()
  ];

  let continueClicked = false;
  const urlBeforeContinue = page.url();
  for (const btn of continueCandidates) {
    const count = await btn.count().catch(() => 0);
    if (count === 0) {
      continue;
    }
    const visible = await btn.isVisible().catch(() => false);
    if (!visible) {
      continue;
    }
    try {
      await btn.scrollIntoViewIfNeeded().catch(() => null);
      await page.waitForTimeout(250);
      await btn.click({ timeout: 5000, force: true });
      continueClicked = true;
      break;
    } catch (e) {
      logger.warn(`Continue click candidate failed: ${e.message}`);
    }
  }

  if (!continueClicked) {
    throw new Error("Could not click Continue button on donation form");
  }

  await page.waitForTimeout(2500);
  const urlAfterContinue = page.url();
  if (urlAfterContinue !== urlBeforeContinue) {
    logger.success("✓ Donation form Continue clicked and navigation detected");
  } else {
    logger.success("✓ Donation form Continue clicked");
  }

  const currentBookingClicked = await clickCurrentBooking(page, browserManager);
  if (!currentBookingClicked) {
    await waitForEnter(
      "Please click 'Current Booking' manually in the browser, then continue",
      "After clicking Current Booking in browser, press ENTER here"
    );
  }
}

async function clickContinueToDonate(page, browserManager) {
  logger.section("Post-Srivani Step: Click Continue to Donate");

  const urlBefore = page.url();
  const donateLocators = [
    page.locator('button:has-text("Continue to Donate")').first(),
    page.locator('a:has-text("Continue to Donate")').first(),
    page.locator('text="Continue to Donate"').first(),
    page.locator('button[ng-click*="donate" i]').first(),
    page.locator('button[ng-click*="continue" i]').first()
  ];

  let clicked = false;

  for (let i = 0; i < donateLocators.length; i++) {
    const locator = donateLocators[i];
    const count = await locator.count().catch(() => 0);
    if (count === 0) {
      continue;
    }

    const isVisible = await locator.isVisible().catch(() => false);
    if (!isVisible) {
      continue;
    }

    try {
      await locator.scrollIntoViewIfNeeded().catch(() => null);
      await page.waitForTimeout(300);
      await locator.click({ timeout: 5000, force: true });
      await page.waitForTimeout(2500);

      const urlAfter = page.url();
      if (urlAfter !== urlBefore) {
        logger.success("✓ Clicked Continue to Donate and navigation detected");
      } else {
        logger.success("✓ Clicked Continue to Donate");
      }

      clicked = true;
      break;
    } catch (e) {
      logger.warn(`Continue to Donate click failed (locator ${i}): ${e.message}`);
    }
  }

  if (!clicked) {
    throw new Error("Could not find/click Continue to Donate button");
  }

  await completeDonationConfirmForm(page, browserManager);
  return true;
}

async function clickSrivaniTrustDonations(page, browserManager) {
  logger.section("Post-Login Step: Open Srivani Trust Donations");
  await page.waitForTimeout(2000);

  const urlBeforeClick = page.url();

  const didNavigateToSrivani = async () => {
    const current = page.url();
    if (current !== urlBeforeClick && /srivani/i.test(current)) {
      return true;
    }

    const onSrivaniScreen = await page
      .locator('text=/Srivani Trust Donations/i')
      .first()
      .isVisible()
      .catch(() => false);

    return onSrivaniScreen && /srivani/i.test(current);
  };

  const srivaniLocators = [
    page.locator('a:has-text("Srivani Trust Donations")').first(),
    page.locator('button:has-text("Srivani Trust Donations")').first(),
    page.locator('div:has-text("Srivani Trust Donations")').first(),
    page.locator('text="Srivani Trust Donations"').first()
  ];

  for (let i = 0; i < srivaniLocators.length; i++) {
    const locator = srivaniLocators[i];
    const count = await locator.count().catch(() => 0);
    if (count === 0) {
      continue;
    }

    const isVisible = await locator.isVisible().catch(() => false);
    if (!isVisible) {
      continue;
    }

    try {
      await locator.scrollIntoViewIfNeeded().catch(() => null);
      await page.waitForTimeout(300);
      await locator.click({ timeout: 5000, force: true });
      await page.waitForTimeout(2500);

      if (await didNavigateToSrivani()) {
        logger.success("✓ Clicked Srivani Trust Donations and navigation confirmed");
        await clickContinueToDonate(page, browserManager);
        return true;
      }

      logger.warn(`Clicked candidate ${i}, but navigation not detected yet`);
    } catch (e) {
      logger.warn(`Srivani click attempt failed (locator ${i}): ${e.message}`);
    }
  }

  logger.warn("Trying DOM-based click fallback for Srivani Trust Donations...");
  const domClickWorked = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("a, button, div"));
    const target = all.find((el) =>
      (el.textContent || "").toLowerCase().includes("srivani trust donations")
    );
    if (!target) return false;

    const clickable = target.closest("a,button") || target;
    clickable.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    return true;
  }).catch(() => false);

  if (domClickWorked) {
    await page.waitForTimeout(2500);
    if (await didNavigateToSrivani()) {
      logger.success("✓ DOM fallback click worked; reached Srivani donations screen");
      await clickContinueToDonate(page, browserManager);
      return true;
    }
  }

  logger.warn("Click navigation not confirmed. Falling back to direct Srivani URL...");
  await browserManager.goto(`${config.baseUrl}/#/srivaniedonations`);
  await page.waitForTimeout(2000);
  if (await didNavigateToSrivani()) {
    logger.success("✓ Reached Srivani donations screen via direct URL fallback");
    await clickContinueToDonate(page, browserManager);
    return true;
  }

  throw new Error("Could not find/click Srivani Trust Donations on welcome page");
}

async function runLoginFlow() {
  const browserManager = await createBrowser();
  const page = browserManager.getPage();

  try {
    logger.section("TTD Login Flow - Step 1: Navigate to Website");

    // Navigate to the website
    await browserManager.goto(`${config.baseUrl}/#/userLogin`);

    // Wait for login page elements to load
    logger.info("Waiting for login form to load...");
    // Try multiple selectors for robustness
    const selectors = [
      '[name="uName"]',           // Current form
      '[ng-model="logc.pageDetails.uName"]',
      '#loginInput',
      '[placeholder="Enter your registered Email ID"]',
      '[name="loginModel.username"]',
      '[ng-model="loginModel.username"]'
    ];

    let found = false;
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        logger.info(`Found login form using selector: ${selector}`);
        found = true;
        break;
      } catch (e) {
        logger.debug(`Selector not found: ${selector}`);
      }
    }

    if (!found) {
      throw new Error("Login form not found with any known selectors");
    }

    logger.success("Login form loaded successfully");

     // Step 2: Skip approval - auto-proceed with form fill
     logger.info("Auto-proceeding with form fill (credentials available in config)");

    // Step 3: Fill username
    logger.info("Filling username field...");
    const usernameField = await page.$('[name="uName"]') || 
                          await page.$('#loginInput') ||
                          await page.$('[ng-model="logc.pageDetails.uName"]');
    if (!usernameField) {
      throw new Error("Username field not found");
    }

    await usernameField.fill(config.username);
    logger.success(`Username filled: ${config.username}`);

    // Step 4: Fill password
    logger.info("Filling password field...");
    const passwordField = await page.$('[name="pwd"]') ||
                          await page.$('[ng-model="logc.pageDetails.pwd"]') ||
                          await page.$('input[type="password"]');
    if (!passwordField) {
      throw new Error("Password field not found");
    }

    await passwordField.fill(config.password);
    logger.success("Password filled (not shown for security)");

     // Step 5: Handle CAPTCHA (manual entry + manual submit)
    logger.info("Checking for CAPTCHA...");
    await page.waitForTimeout(1000); // Wait for CAPTCHA to render
    
    const captchaField = await page.$('[name="txtInput"]') || 
                         await page.$('[placeholder*="Captcha"]') ||
                         await page.$('input[ng-model*="cha"]');

    if (captchaField) {
      logger.warn("CAPTCHA field detected!");
      logger.warn("Please enter CAPTCHA in browser and click Login manually.");

      const loginUrl = page.url();
      const maxWaitMs = 180000;
      const pollMs = 500;
      const start = Date.now();
      let manualNavigationDetected = false;

      logger.info("Waiting for manual CAPTCHA submit and navigation...");
      while (Date.now() - start < maxWaitMs) {
        const currentUrl = page.url();
        if (currentUrl !== loginUrl && !currentUrl.includes("#/userLogin")) {
          manualNavigationDetected = true;
          break;
        }
        await page.waitForTimeout(pollMs);
      }

      if (!manualNavigationDetected) {
        throw new Error("Timed out waiting for manual CAPTCHA login (3 minutes)");
      }

      logger.success("✓ Manual CAPTCHA login submitted and navigation detected");
    } else {
      logger.info("No CAPTCHA field detected on this page");

      logger.info("Submitting login form...");
      let loginButton = null;
      const buttonSelectors = [
        'button[type="submit"]',
        'button:has-text("Login")',
        'button:has-text("Sign In")',
        'button:has-text("Submit")',
        'form button:first-of-type'
      ];

      for (const selector of buttonSelectors) {
        try {
          loginButton = await page.$(selector);
          if (loginButton) {
            logger.info(`Found login button using selector: ${selector}`);
            break;
          }
        } catch (e) {
          logger.debug(`Button selector failed: ${selector}`);
        }
      }

      if (!loginButton) {
        const buttons = await page.$$("button");
        for (const btn of buttons) {
          const text = await btn.textContent();
          if (text && (text.includes("Login") || text.includes("Submit") || text.includes("Sign In"))) {
            loginButton = btn;
            logger.info("Found login button by text content");
            break;
          }
        }
      }

      if (!loginButton) {
        throw new Error("Login button not found");
      }

      await loginButton.click();
      logger.info("Login button clicked, waiting for authentication...");

      logger.info("Waiting for authentication to complete...");
      try {
        await page.waitForNavigation({ timeout: 10000 }).catch(() => {
          // Navigation might not happen, check for dashboard instead
        });
      } catch (e) {
        logger.warn("Navigation wait timeout - checking for successful login");
      }
    }

    // Wait for dashboard or error message
    await page.waitForTimeout(3000);

    // Check if login was successful
    const dashboardContent = await page.$(".dashboard, [ng-controller*='Dashboard'], .home-content");
    const currentUrl = page.url();
    const loggedIn = Boolean(dashboardContent) || currentUrl.includes("#/welcome");

    if (loggedIn) {
      logger.success("✓ Login successful! Dashboard loaded.");
      await clickSrivaniTrustDonations(page, browserManager);
      return true;
    } else {
      logger.warn("Could not confirm dashboard. Check screenshot to verify login status.");
      return true; // Allow user to verify manually
    }
  } catch (error) {
    logger.error(`Login flow failed: ${error.message}`);
    printError(error.message);
    throw error;
  } finally {
    logger.info("Login flow completed. Browser remains open for next steps.");
    logger.info("You can now run the booking script or close the browser manually.");
  }
}

// Main execution
(async () => {
  try {
    logger.section("TTD Guided Booking - Login Script");
    logger.info("This script will guide you through the login process with manual approval at each step.");

    const result = await runLoginFlow();

    if (result) {
      logger.success("✓ Login process completed successfully!");
      logger.info("\nSingle-script mode is active.");
      logger.info("Use only 'npm run start' for this flow.");
    }
  } catch (error) {
    logger.error(`Script execution failed: ${error.message}`);
    process.exit(1);
  } finally {
    closePrompt();
    // Keep browser open for manual verification
    logger.info("\nBrowser will remain open. Close it manually when done.");
  }
})();
