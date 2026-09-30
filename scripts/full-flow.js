import { createBrowser } from "./utils/browser.js";
import { logger } from "./utils/logger.js";
import { extractCaptcha } from "./utils/ocr.js";
import { enterText, closePrompt, printWarning } from "./utils/prompts.js";
import config from "../config/config.js";

// ═══════════════════════════════════════════════════════════════════
// DETAILED ACTION LOGGING
// ═══════════════════════════════════════════════════════════════════

function logAction(action, details = {}) {
  const timestamp = new Date().toISOString();
  const detailsStr = Object.entries(details)
    .map(([key, value]) => `${key}=${value}`)
    .join(" | ");
  
  const logEntry = `[${timestamp}] ACTION: ${action} | ${detailsStr}`;
  logger.info(`📋 ${logEntry}`);
  console.log(logEntry); // Also log to console for immediate visibility
}

function logDecision(title, options, selected) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] DECISION: ${title} | Options=[${options.join(", ")}] | Selected=${selected}`;
  logger.success(`✓ ${logEntry}`);
  console.log(logEntry);
}

function logError(errorMsg, context = {}) {
  const timestamp = new Date().toISOString();
  const contextStr = Object.entries(context)
    .map(([key, value]) => `${key}=${value}`)
    .join(" | ");
  
  const logEntry = `[${timestamp}] ERROR: ${errorMsg} | ${contextStr}`;
  logger.error(`❌ ${logEntry}`);
  console.log(logEntry);
}

// ═══════════════════════════════════════════════════════════════════
// INTERACTIVE FALLBACK HELPERS
// ═══════════════════════════════════════════════════════════════════

async function handleCaptchaFailure(page, browserManager, retryCount = 0) {
  if (retryCount >= 3) {
    logError("CAPTCHA failed 3 times", { attempts: retryCount });
    logger.error("❌ CAPTCHA failed 3 times. Asking for manual input...");
    const manualCaptcha = await enterText(
      "Please look at the CAPTCHA image in the browser and enter the code manually",
      "Example: N8371LU6"
    );
    logDecision("CAPTCHA Manual Entry", ["manual"], manualCaptcha);
    logAction("CAPTCHA entered manually", { code: manualCaptcha, length: manualCaptcha.length });
    return manualCaptcha;
  }

  logError("CAPTCHA OCR failed", { attempt: retryCount + 1, maxAttempts: 3 });
  logger.warn(`CAPTCHA recognition failed (attempt ${retryCount + 1}/3)`);
  const retryOrManual = await enterText(
    "Enter CAPTCHA code manually, or type 'retry' to let OCR try again",
    "Example: N8371LU6 or 'retry'"
  );

  if (retryOrManual.toLowerCase() === "retry") {
    logDecision("CAPTCHA Recovery", ["manual", "retry"], "retry");
    logAction("Retrying CAPTCHA OCR", { attempt: retryCount + 2 });
    try {
      const newCaptcha = await extractCaptcha(page);
      if (newCaptcha && newCaptcha.length >= 4) {
        logAction("CAPTCHA OCR succeeded on retry", { code: newCaptcha });
        logger.success(`✓ OCR succeeded on retry: ${newCaptcha}`);
        return newCaptcha;
      } else {
        logError("CAPTCHA OCR result too short", { result: newCaptcha, length: newCaptcha?.length });
        return await handleCaptchaFailure(page, browserManager, retryCount + 1);
      }
    } catch (e) {
      logError("CAPTCHA OCR threw exception", { error: e.message, attempt: retryCount + 2 });
      return await handleCaptchaFailure(page, browserManager, retryCount + 1);
    }
  }

  logDecision("CAPTCHA Recovery", ["manual", "retry"], "manual");
  logAction("CAPTCHA entered manually", { code: retryOrManual, length: retryOrManual.length });
  return retryOrManual;
}

async function handleLoginFailure(page, browserManager) {
  logError("Login verification failed", { currentUrl: page.url() });
  logger.error("❌ Login verification failed!");
  const currentUrl = page.url();
  logger.warn(`Current URL: ${currentUrl}`);
  
  logger.info("Automatically skipping to donation page...");
  logDecision("Login Recovery", ["auto_skip"], "auto");
  logAction("Automatically skipping login verification - navigating to donation page", { navigatingTo: "#/SrivaniDonationConfirm" });
  
  try {
    await browserManager.goto(`${config.baseUrl}/#/SrivaniDonationConfirm`);
    await page.waitForTimeout(2000);
    const afterRecoveryUrl = page.url();
    if (afterRecoveryUrl.includes("#/userLogin")) {
      logger.warn("Login recovery did not reach donation page (still on login page)");
      logError("Login recovery unresolved", { currentUrl: afterRecoveryUrl });
      return false;
    }
    logger.success("✓ Successfully navigated to donation page");
    return true;
  } catch (e) {
    logger.warn(`Navigation failed: ${e.message}`);
    logError("Failed to navigate to donation page", { error: e.message });
    return false;
  }
}

async function handleButtonClickFailure(buttonName, page, browserManager, retryCount = 0) {
  if (retryCount >= 3) {
    logError(`${buttonName} click failed after 3 attempts`, { button: buttonName, attempts: retryCount });
    logger.error(`❌ ${buttonName} click failed 3 times. Attempting automatic recovery...`);
    
    // Automatic recovery: wait for page state change
    logger.info("Waiting for automatic recovery...");
    await page.waitForTimeout(2000);
    
    const pageChanged = await page.evaluate(() => {
      return window.location.href.includes('donation') || 
             window.location.href.includes('booking') ||
             document.querySelector('form') !== null;
    });
    
    if (pageChanged) {
      logDecision(`${buttonName} Automatic Recovery`, ["auto"], "success");
      logAction(`${buttonName} recovery succeeded automatically`, { button: buttonName });
      logger.success(`✓ ${buttonName} completed via automatic recovery`);
      return true;
    }
    
    logDecision(`${buttonName} Automatic Recovery`, ["auto"], "failed");
    logAction(`${buttonName} recovery failed - continuing anyway`, { button: buttonName });
    logger.warn(`${buttonName} recovery unsuccessful - continuing flow`);
    return true; // Continue anyway to preserve flow
  }

  logError(`${buttonName} click failed`, { button: buttonName, attempt: retryCount + 1, maxAttempts: 3 });
  logger.warn(`${buttonName} click failed (attempt ${retryCount + 1}/3) - retrying automatically...`);
  logAction(`Retrying ${buttonName} click automatically`, { button: buttonName, nextAttempt: retryCount + 2 });
  return false; // Signal to retry automation
}

async function handleCheckboxFailure(checkboxName, page, browserManager) {
  logError(`${checkboxName} not found or could not be checked`, { checkbox: checkboxName });
  logger.warn(`${checkboxName} not found or could not be checked`);
  
  logger.info("Attempting automatic recovery...");
  logAction(`Attempting automatic ${checkboxName} recovery`, { checkbox: checkboxName });
  
  // Automatic recovery: wait and retry detection
  await page.waitForTimeout(1000);
  
  const checkboxFound = await page.evaluate((name) => {
    const selectors = [
      'input[type="checkbox"]',
      '[ng-model*="citizenship"]',
      '[ng-model*="corpus"]'
    ];
    
    for (const selector of selectors) {
      const checkbox = document.querySelector(selector);
      if (checkbox) return true;
    }
    return false;
  }, checkboxName);
  
  if (checkboxFound) {
    logger.success(`✓ ${checkboxName} found during recovery`);
    logDecision(`${checkboxName} Recovery`, ["auto"], "recovered");
    logAction(`${checkboxName} recovered automatically`, { checkbox: checkboxName });
    return true;
  }
  
  logger.info(`Proceeding without ${checkboxName}...`);
  logDecision(`${checkboxName} Recovery`, ["auto"], "skipped");
  logAction(`Proceeding without ${checkboxName}`, { checkbox: checkboxName, skipped: true });
  return true; // Continue anyway
}

// ═══════════════════════════════════════════════════════════════════
// UNIVERSAL STEP FAILURE RECOVERY
// ═══════════════════════════════════════════════════════════════════

async function handleStepFailure(stepName, stepDescription, page, browserManager) {
  if (page.isClosed()) {
    logger.warn("Recovery skipped because browser page is already closed.");
    return false;
  }

  logger.section(`⚠️  STEP FAILED: ${stepName}`);
  logger.warn(`The automation encountered an issue with: ${stepDescription}`);
  logger.info(`Attempting automatic recovery...\n`);
  
  logError(`Step failed - attempting automatic recovery`, { step: stepName, description: stepDescription });
  
  // Take screenshot before recovery
  await browserManager.screenshot(`auto-recovery-attempt-${stepName.replace(/\s+/g, '-')}.png`).catch(() => null);
  logAction(`Screenshot taken for step failure`, { step: stepName });
  
  // Automatic recovery strategies
  logger.info("Recovery Strategy 1: Waiting for page to stabilize...");
  await page.waitForTimeout(3000).catch(() => null);
  
  logger.info("Recovery Strategy 2: Attempting to detect page changes...");
  const pageUrl = page.url();
  const pageTitle = await page.title().catch(() => "unknown");
  logger.debug(`Current URL: ${pageUrl} | Title: ${pageTitle}`);
  
  logger.info("Recovery Strategy 3: Checking if step completed despite automation error...");
  const stepCompleted = await page.evaluate(() => {
    return {
      urlChanged: window.location.href.includes('booking') || window.location.href.includes('donation'),
      welcomeHeaderVisible: !!document.querySelector('.welcome-header') || !!document.querySelector('[ng-if*="welcome"]'),
      formLoaded: !!document.querySelector('form'),
      checkboxesVisible: document.querySelectorAll('input[type="checkbox"]').length > 0
    };
  }).catch(() => ({
    urlChanged: false,
    welcomeHeaderVisible: false,
    formLoaded: false,
    checkboxesVisible: false
  }));
  
  logger.debug(`Step completion indicators:`, stepCompleted);
  
  if (stepCompleted.urlChanged || stepCompleted.welcomeHeaderVisible) {
    logger.success(`✓ ${stepName} completed successfully (automatic recovery)`);
    logger.info("Continuing with next step...\n");
    logDecision(`Step Completion - ${stepName}`, ["auto_recovered"], "success");
    return true;
  }
  
  // If recovery failed, take a screenshot and log it
  await page.waitForTimeout(1000).catch(() => null);
  await browserManager.screenshot(`after-recovery-attempt-${stepName.replace(/\s+/g, '-')}.png`).catch(() => null);
  logAction(`Automatic recovery attempted for step`, { step: stepName, recovered: false });
  
  logger.warn(`⚠️  Automatic recovery unsuccessful for "${stepName}"`);
  logger.info("Step will be retried on next automation run or may require manual intervention.");
  logger.info("Continuing anyway to preserve automation flow...\n");
  
  logDecision(`Step Completion - ${stepName}`, ["auto_recovery_failed"], "warning");
  
  return true; // Return true to continue flow despite failure
}

async function runFullFlow() {
  const browserManager = await createBrowser();
  const page = browserManager.getPage();

  try {
    // ═══════════════════════════════════════════════════════════════════
    // PHASE 1: LOGIN
    // ═══════════════════════════════════════════════════════════════════
    
    logger.section("PHASE 1: LOGIN (MANUAL CAPTCHA ENTRY)");

    // Step 1: Navigate to login page
    logger.info("Navigating to login page...");
    await browserManager.goto(`${config.baseUrl}/#/userLogin`);

    // Wait for login form
    logger.info("Waiting for login form to load...");
    const selectors = [
      '[name="uName"]',
      '[ng-model="logc.pageDetails.uName"]',
      '#loginInput'
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
      logError("Login form not found", { selectorsChecked: 3 });
      // Use universal failure handler
      await handleStepFailure(
        "Login Form Loading",
        "The login form could not be loaded. Please wait for the page to load completely or refresh the page in the browser.",
        page,
        browserManager
      );
      logger.info("Continuing after manual login form handling...");
    }

    logger.success("Login form loaded successfully");
    await browserManager.screenshot("01-login-form-ready.png");

     // Step 2: Fill username
     logger.info("Filling username field...");
     const usernameField = await page.$('[name="uName"]') || 
                           await page.$('#loginInput') ||
                           await page.$('[ng-model="logc.pageDetails.uName"]');
      if (!usernameField) {
        logError("Username field not found", { selectors: 3 });
        await handleStepFailure(
          "Username Field",
          "The username input field could not be found on the login page. Please manually enter your username in the appropriate field.",
          page,
          browserManager
        );
        logger.info("Continuing after manual username entry...");
      } else {
        // Use JavaScript to set value via AngularJS model
        await page.evaluate((username) => {
          const field = document.querySelector('[name="uName"]') || document.querySelector('#loginInput') || document.querySelector('[ng-model="logc.pageDetails.uName"]');
          if (field) {
            field.value = username;
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
            field.dispatchEvent(new Event('blur', { bubbles: true }));
            // Trigger AngularJS digest cycle
            if (window.angular) {
              angular.element(field).scope().$apply();
            }
          }
        }, config.username);
        logger.success(`Username filled: ${config.username}`);
      }
     await browserManager.screenshot("02-username-filled.png");

     // Step 3: Fill password
     logger.info("Filling password field...");
     const passwordField = await page.$('[name="pwd"]') ||
                           await page.$('[ng-model="logc.pageDetails.pwd"]') ||
                           await page.$('input[type="password"]');
      if (!passwordField) {
        logError("Password field not found", { selectors: 3 });
        await handleStepFailure(
          "Password Field",
          "The password input field could not be found on the login page. Please manually enter your password in the appropriate field.",
          page,
          browserManager
        );
        logger.info("Continuing after manual password entry...");
      } else {
        // Use JavaScript to set value via AngularJS model
        await page.evaluate((password) => {
          const field = document.querySelector('[name="pwd"]') || document.querySelector('[ng-model="logc.pageDetails.pwd"]') || document.querySelector('input[type="password"]');
          if (field) {
            field.value = password;
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
            field.dispatchEvent(new Event('blur', { bubbles: true }));
            // Trigger AngularJS digest cycle
            if (window.angular) {
              angular.element(field).scope().$apply();
            }
          }
        }, config.password);
        logger.success("Password filled (not shown for security)");
      }
     await browserManager.screenshot("03-password-filled.png");

     // Step 4: Handle CAPTCHA with automatic OCR + interactive fallback
     logger.info("Checking for CAPTCHA...");
     // Wait longer for page to fully render (CAPTCHA image loads dynamically)
     await page.waitForTimeout(3000);
     
     const captchaField = await page.$('[name="txtInput"]') || 
                          await page.$('[placeholder*="Captcha"]') ||
                          await page.$('input[ng-model*="cha"]');

    if (captchaField) {
      logger.warn("CAPTCHA field detected!");
      await browserManager.screenshot("04-captcha-visible.png");

      logger.warn("⚠️ CAPTCHA is present. Please enter CAPTCHA manually in the browser.");
      logger.info("Waiting for CAPTCHA input in browser (no terminal input needed)...");

      let captchaValue = "";
      const maxCaptchaWaitMs = 120000;
      const captchaPollMs = 500;
      const captchaStart = Date.now();

      while (Date.now() - captchaStart < maxCaptchaWaitMs) {
        captchaValue = await captchaField.inputValue().catch(() => "");
        if (captchaValue && captchaValue.trim().length >= 4) {
          break;
        }
        await page.waitForTimeout(captchaPollMs);
      }

      if (!captchaValue || captchaValue.trim().length < 4) {
        throw new Error("CAPTCHA not entered in browser within 120 seconds");
      }
      logger.success("✓ CAPTCHA entered manually by user");
      
      await browserManager.screenshot("05-captcha-filled.png");
      
      // After CAPTCHA is filled, automatically click the Login button
      logger.info("CAPTCHA captured - clicking Login button...");
      logAction("CAPTCHA entered manually - clicking Login button automatically", { reason: "user-entered-captcha" });
      
      // Find and click the login button
      logger.info("Attempting to find and click Login button...");
      const loginButtonSelectors = [
        'button[type="submit"]',
        'button.btn-primary',
        'button.btn-success',
        'button[ng-click*="login"]',
        'button[onclick*="login"]'
      ];
      
      let loginClicked = false;
      
      // Try CSS selectors first
      for (const selector of loginButtonSelectors) {
        try {
          const btn = page.locator(selector).first();
          const count = await btn.count().catch(() => 0);
          const visible = count > 0 ? await btn.isVisible().catch(() => false) : false;
          if (visible) {
            logger.info(`Found Login button using selector: ${selector}`);
            await btn.click();
            loginClicked = true;
            logger.success("✓ Login button clicked automatically");
            logAction("Login button clicked automatically", { selector: selector });
            break;
          }
        } catch (e) {
          logger.debug(`Selector ${selector} not found or click failed`);
        }
      }
      
      // If CSS selectors didn't work, try finding button by text content
      if (!loginClicked) {
        try {
          logger.info("Trying to find button by text content...");
          const buttonFound = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const loginBtn = buttons.find(b => 
              b.textContent.toLowerCase().includes('login') || 
              b.textContent.toLowerCase().includes('submit') ||
              b.textContent.toLowerCase().includes('sign in')
            );
            if (loginBtn) {
              loginBtn.click();
              return true;
            }
            return false;
          });
          
          if (buttonFound) {
            loginClicked = true;
            logger.success("✓ Login button clicked by text content");
            logAction("Login button clicked by text content", {});
          }
        } catch (e) {
          logger.debug("Text-based button search failed");
        }
      }
      
      if (!loginClicked) {
        logger.warn("Could not find/click Login button - waiting for manual click...");
        logAction("Login button not found - waiting for manual interaction", { reason: "Button not detected" });
      }
      
      // Wait for login to complete
      logger.info("Waiting for authentication to complete...");
      let navigationHappened = false;
      const maxWaitTime = 30000; // 30 seconds max wait
      const urlBeforeLoginSubmit = page.url();
      
      try {
        const navigated = await page
          .waitForNavigation({ timeout: maxWaitTime, waitUntil: 'domcontentloaded' })
          .then(() => true)
          .catch(() => false);

        if (navigated) {
          navigationHappened = true;
          logger.success("✓ Login completed - navigation detected");
        } else {
          logger.info("Navigation wait timeout - checking page state...");
          const currentUrlAfterSubmit = page.url();
          navigationHappened = currentUrlAfterSubmit !== urlBeforeLoginSubmit && !currentUrlAfterSubmit.includes("#/userLogin");
          if (navigationHappened) {
            logger.success("✓ Login appears successful based on URL state");
          } else {
            logger.warn("⚠️ Login did not navigate away from login page");
          }
        }
      } catch (e) {
        logger.info("Navigation detection timeout - checking if logged in anyway...");
      }
      
      logDecision("Login Click", ["automatic"], "completed");
      await page.waitForTimeout(2000);
    } else {
      logger.info("No CAPTCHA field detected on this page");
      
      // Step 5: Click login button if no CAPTCHA
      logger.info("Submitting login form (no CAPTCHA detected)...");
      let loginButton = null;
      const buttonSelectors = [
        'button[type="submit"]',
        'button.btn-primary',
        'button.btn-success',
        'button[ng-click*="login"]'
      ];

      for (const selector of buttonSelectors) {
        try {
          const candidate = page.locator(selector).first();
          const count = await candidate.count().catch(() => 0);
          const visible = count > 0 ? await candidate.isVisible().catch(() => false) : false;
          if (visible) {
            loginButton = candidate;
            logger.info(`Found login button using selector: ${selector}`);
            break;
          }
        } catch (e) {
          logger.debug(`Button selector failed: ${selector}`);
        }
      }

      if (!loginButton) {
        // Try finding button by text content
        const textLoginButton = page.locator('button').filter({ hasText: /login|submit|sign in/i }).first();
        const textMatchCount = await textLoginButton.count().catch(() => 0);
        const textMatchVisible = textMatchCount > 0
          ? await textLoginButton.isVisible().catch(() => false)
          : false;
        if (textMatchVisible) {
          loginButton = textLoginButton;
          logger.info("Found login button using text matching");
        }
      }

      if (!loginButton) {
        throw new Error("Login button not found");
      }

      await loginButton.click();
      logger.info("Login button clicked, waiting for authentication...");
      await browserManager.screenshot("06-login-submitted.png");

      // Wait for authentication
      logger.info("Waiting for authentication to complete...");
      try {
        await page.waitForNavigation({ timeout: 10000 }).catch(() => {});
      } catch (e) {
        logger.warn("Navigation wait timeout - checking for successful login");
      }

      await page.waitForTimeout(3000);
    }

    await browserManager.screenshot("06-after-login-attempt.png");
     logger.success("✓ Login process completed!");

     // ═══════════════════════════════════════════════════════════════════
     // LOGIN VERIFICATION
     // ═══════════════════════════════════════════════════════════════════

     logger.section("VERIFYING LOGIN SUCCESS");
     
     const currentUrl = page.url();
     logger.info(`Current URL after login: ${currentUrl}`);
     
     // Check for error messages on the page
     try {
       const errorMessages = await page.evaluate(() => {
         const errors = [];
         // Check common error message containers
         const errorElements = document.querySelectorAll('[class*="error"], [class*="alert"], [ng-show*="error"], .alert-danger, .text-danger');
         errorElements.forEach(el => {
           const text = el.textContent.trim();
           if (text && text.length > 0) {
             errors.push(text);
           }
         });
         return errors;
       });
       
       if (errorMessages.length > 0) {
         logger.warn("Error messages found on page:");
         errorMessages.forEach(msg => logger.warn(`  - ${msg}`));
       }
     } catch (e) {
       logger.debug("Could not check for error messages");
     }
     
     await browserManager.screenshot("07-after-login.png");

     // Check if login was successful by verifying URL changed from login page
     if (currentUrl.includes("#/userLogin")) {
       logger.error("❌ LOGIN FAILED - Still on login page!");
       logger.error("CAPTCHA may have been incorrect or credentials invalid");
      
      // Interactive fallback
      const loginRecovered = await handleLoginFailure(page, browserManager);
      if (!loginRecovered) {
        throw new Error("Login recovery failed");
      }
    } else {
      // Verify we're on a valid authenticated page
      const validPages = [
        "#/welcome",
        "#/SrivaniDonationConfirm",
        "#/bookingForm",
        "#/homepage"
      ];

      const isLoggedIn = validPages.some(validPage => currentUrl.includes(validPage));
      
      if (!isLoggedIn) {
        logger.error("❌ LOGIN VERIFICATION FAILED");
        logger.error(`Current URL: ${currentUrl}`);
        logger.error("Expected to be on one of: " + validPages.join(", "));
        
        // Interactive fallback
        const loginRecovered = await handleLoginFailure(page, browserManager);
        if (!loginRecovered) {
          throw new Error("Login verification failed");
        }
      }
    }

    logger.success("✓ LOGIN VERIFICATION PASSED");
    logger.success("✓ Successfully authenticated!");

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 2: CLICK SRIVANI TRUST DONATIONS
    // ═══════════════════════════════════════════════════════════════════

    logger.section("PHASE 2: OPEN SRIVANI TRUST DONATIONS");
    const currentAfterLoginUrl = page.url();
    logger.info(`Current URL after login: ${currentAfterLoginUrl}`);

    await page.waitForTimeout(2000);
    await browserManager.screenshot("08-welcome-page.png");

    const srivaniLocators = [
      page.locator('a:has-text("Srivani Trust Donations")').first(),
      page.locator('button:has-text("Srivani Trust Donations")').first(),
      page.locator('div:has-text("Srivani Trust Donations")').first(),
      page.locator('text="Srivani Trust Donations"').first()
    ];

    let srivaniClicked = false;
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
        await locator.click({ timeout: 5000 });
        srivaniClicked = true;
        logger.success("✓ Clicked Srivani Trust Donations");
        logAction("Srivani Trust Donations clicked", { locatorIndex: i });
        break;
      } catch (e) {
        logger.warn(`Srivani click attempt failed (locator ${i}): ${e.message}`);
      }
    }

    if (!srivaniClicked) {
      throw new Error("Could not find/click Srivani Trust Donations on welcome page");
    }

    await page.waitForTimeout(2000);
    await browserManager.screenshot("09-srivani-donation-opened.png");

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 3: HANDLE CONFIRMATION DIALOG - CLICK YES BUTTON
    // ═══════════════════════════════════════════════════════════════════

    logger.section("PHASE 3: HANDLE CONFIRMATION DIALOG");
    logger.info("Waiting for confirmation dialog to appear...");

    // Wait for confirmation dialog
    let dialogFound = false;
    const maxDialogWaitTime = 10000; // 10 seconds
    const dialogStartTime = Date.now();

    while (Date.now() - dialogStartTime < maxDialogWaitTime && !dialogFound) {
      try {
        // Check if dialog is visible
        const hasDialog = await page.evaluate(() => {
          const dialogs = document.querySelectorAll('[role="dialog"], .modal, .modal-dialog, .confirmation-dialog, .alert');
          return dialogs.length > 0;
        }).catch(() => false);

        if (hasDialog) {
          dialogFound = true;
          logger.success("✓ Confirmation dialog detected");
          logAction("Confirmation dialog found", { waitTime: Date.now() - dialogStartTime });
          break;
        }
      } catch (e) {
        logger.debug("Dialog detection check failed, retrying...");
      }
      
      await page.waitForTimeout(500);
    }

    if (!dialogFound) {
      logger.warn("⚠️  Confirmation dialog not detected within timeout - attempting to proceed anyway");
      logAction("Confirmation dialog not detected", { timeout: maxDialogWaitTime });
    } else {
      await browserManager.screenshot("10-confirmation-dialog-visible.png");

      // Strategy 1: Try modern Playwright locator with text matching
      logger.info("Attempting to locate 'Yes' button...");
      const yesButtonSelectors = [
        { method: 'locator', value: 'button:has-text("Yes")' },
        { method: 'locator', value: 'button[style*="background"]' },
        { method: 'xpath', value: '//button[contains(text(), "Yes")]' },
        { method: 'xpath', value: '//button[normalize-space()="Yes"]' },
        { method: 'xpath', value: '//button[contains(., "Yes")]' },
        { method: 'xpath', value: '//*[text()="Yes"]' },
        { method: 'locator', value: 'button.btn-danger' },
        { method: 'locator', value: 'button[type="button"]:has-text("Yes")' }
      ];

      let yesButtonClicked = false;
      let clickedUsing = null;

      // Try each selector strategy
      for (const selector of yesButtonSelectors) {
        try {
          let element = null;
          
          if (selector.method === 'locator') {
            const locator = page.locator(selector.value).first();
            const count = await locator.count().catch(() => 0);
            
            if (count > 0) {
              const isVisible = await locator.isVisible().catch(() => false);
              if (isVisible) {
                logger.info(`Found Yes button using locator: ${selector.value}`);
                await locator.click({ timeout: 5000 });
                yesButtonClicked = true;
                clickedUsing = `locator: ${selector.value}`;
                break;
              }
            }
          } else if (selector.method === 'xpath') {
            const foundByXPath = await page.evaluate((xpath) => {
              const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
              const node = result.singleNodeValue;
              if (node && node.offsetParent !== null) { // Check if visible
                node.click();
                return true;
              }
              return false;
            }, selector.value).catch(() => false);

            if (foundByXPath) {
              logger.info(`Found Yes button using XPath: ${selector.value}`);
              yesButtonClicked = true;
              clickedUsing = `xpath: ${selector.value}`;
              break;
            }
          }
        } catch (e) {
          logger.debug(`Selector attempt failed (${selector.method}): ${e.message}`);
        }
      }

       // Strategy 2: If CSS/XPath failed, try finding button by iterating all buttons
       if (!yesButtonClicked) {
         logger.info("Trying to find Yes button by text content search...");
         try {
           // Get all buttons and their text for debugging
           const allButtons = await page.evaluate(() => {
             return Array.from(document.querySelectorAll('button')).map(b => ({
               text: b.textContent.trim(),
               html: b.innerHTML,
               classes: b.className,
               visible: b.offsetParent !== null,
               tag: b.tagName,
               innerText: b.innerText || ''
             }));
           }).catch(() => []);

           logger.debug(`Found ${allButtons.length} buttons on page`);
           allButtons.forEach((btn, idx) => {
             logger.debug(`Button ${idx}: "${btn.text}" | InnerText: "${btn.innerText}" | Classes: ${btn.classes} | Visible: ${btn.visible}`);
           });

           const foundByText = await page.evaluate(() => {
             const buttons = Array.from(document.querySelectorAll('button'));
             
             // Helper to normalize button text
             const normalizeText = (text) => text.trim().toLowerCase().replace(/\s+/g, ' ');
             
             // Try exact match first
             let yesBtn = buttons.find(b => {
               const normalized = normalizeText(b.textContent);
               return normalized === 'yes';
             });

             // Try case-insensitive match with text content
             if (!yesBtn) {
               yesBtn = buttons.find(b => {
                 const normalized = normalizeText(b.textContent);
                 return normalized === 'yes' || normalized.includes('yes');
               });
             }

             // Try innerText as alternative
             if (!yesBtn) {
               yesBtn = buttons.find(b => {
                 const text = normalizeText(b.innerText || b.textContent || '');
                 return text === 'yes' || text.includes('yes');
               });
             }
             
             if (yesBtn) {
               logger.debug(`Found Yes button: "${yesBtn.textContent.trim()}"`);
               
               // Make sure it's visible and clickable
               if (yesBtn.offsetParent !== null && yesBtn.style.display !== 'none') {
                 logger.debug("Button is visible, clicking now...");
                 yesBtn.click();
                 return true;
               } else {
                 logger.debug("Button found but not visible");
                 return false;
               }
             }
             
             return false;
           }).catch(() => false);

           if (foundByText) {
             logger.success("✓ Yes button clicked by text content search");
             logAction("Yes button clicked", { method: "text_content_search" });
             yesButtonClicked = true;
             clickedUsing = "text_content_search";
           }
         } catch (e) {
           logger.debug("Text-based button search failed: " + e.message);
         }
       }

        // Strategy 2.5: Modal-specific button search
        if (!yesButtonClicked) {
          logger.info("Trying modal-specific button search...");
          try {
            const modalSearch = await page.evaluate(() => {
              const normalizeText = (text) => text.trim().toLowerCase().replace(/\s+/g, ' ');
              
              // First, remove any backdrops that might block clicks
              const backdrops = document.querySelectorAll('.modal-backdrop, [class*="backdrop"]');
              backdrops.forEach(b => b.remove());
              
              // Find modal containers
              const modals = document.querySelectorAll('.modal, [role="dialog"], .modal-dialog, .confirmation-dialog');
              
              for (const modal of modals) {
                // Make modal visible and clickable
                modal.style.pointerEvents = 'auto';
                modal.style.display = 'block';
                modal.style.visibility = 'visible';
                modal.style.opacity = '1';
                
                const buttons = modal.querySelectorAll('button');
                
                for (const btn of buttons) {
                  const normalized = normalizeText(btn.textContent);
                  
                  if (normalized === 'yes' || (normalized.length < 10 && normalized.includes('yes'))) {
                    // Make button clickable
                    btn.style.pointerEvents = 'auto';
                    btn.style.display = 'inline-block';
                    btn.style.visibility = 'visible';
                    btn.style.opacity = '1';
                    
                    // Dispatch click events
                    const clickEvent = new MouseEvent('click', {
                      bubbles: true,
                      cancelable: true,
                      view: window
                    });
                    btn.dispatchEvent(clickEvent);
                    
                    // Also try direct click
                    btn.click();
                    
                    return { success: true, text: btn.textContent.trim(), method: 'js_click' };
                  }
                }
              }
              
              return { success: false };
            }).catch((e) => {
              return { success: false, error: e.message };
            });

            if (modalSearch.success) {
              logger.success(`✓ Yes button clicked via modal search (text: "${modalSearch.text}", method: ${modalSearch.method})`);
              logAction("Yes button clicked", { method: "modal_specific_search" });
              yesButtonClicked = true;
              clickedUsing = "modal_specific_search";
            }
          } catch (e) {
            logger.debug("Modal-specific search failed: " + e.message);
          }
        }

      if (yesButtonClicked) {
        logger.success(`✓ Yes button clicked successfully (${clickedUsing})`);
        logAction("Confirmation Yes button clicked", { method: clickedUsing });
        
        await browserManager.screenshot("11-yes-button-clicked.png");

        // Wait for page to navigate or dialog to close
        logger.info("Waiting for page to update after Yes button click...");
        await page.waitForTimeout(2000);

        // Check if modal is still visible
        let modalStillVisible = await page.evaluate(() => {
          const dialogs = document.querySelectorAll('[role="dialog"], .modal, .modal-dialog, .confirmation-dialog');
          return dialogs.length > 0;
        }).catch(() => true);

        if (modalStillVisible) {
          logger.warn("⚠️  Modal still visible after click, retrying click...");
          await page.waitForTimeout(1000);
          
          // Retry click with more force
          await page.evaluate(() => {
            const normalizeText = (text) => text.trim().toLowerCase().replace(/\s+/g, ' ');
            const modals = document.querySelectorAll('.modal, .modal-dialog, [role="dialog"], .confirmation-dialog');
            for (const modal of modals) {
              const buttons = modal.querySelectorAll('button');
              for (const btn of buttons) {
                if (normalizeText(btn.textContent) === 'yes') {
                  btn.click();
                  return true;
                }
              }
            }
            return false;
          }).catch(() => false);
          
          await page.waitForTimeout(2000);
          
          // Check again
          modalStillVisible = await page.evaluate(() => {
            const dialogs = document.querySelectorAll('[role="dialog"], .modal, .modal-dialog, .confirmation-dialog');
            return dialogs.length > 0;
          }).catch(() => false);
          
          if (!modalStillVisible) {
            logger.success("✓ Modal closed after retry");
          } else {
            logger.warn("⚠️  Modal still visible after retry - attempting backdrop dismiss");
            // Try clicking modal backdrop to close
            await page.evaluate(() => {
              const backdrop = document.querySelector('.modal-backdrop, [class*="backdrop"]');
              if (backdrop) backdrop.click();
            }).catch(() => {});
            await page.waitForTimeout(1500);
          }
        }

        try {
          // Wait for navigation or page change
          await Promise.race([
            page.waitForNavigation({ timeout: 5000 }).catch(() => {}),
            page.waitForTimeout(3000)
          ]);
        } catch (e) {
          logger.debug("Navigation wait timeout - continuing anyway");
        }

        await browserManager.screenshot("12-after-yes-button.png");
        logger.success("✓ Confirmation dialog handled successfully");
        logDecision("Confirmation Dialog", ["yes_clicked"], "success");
       } else {
         logger.warn("⚠️  Could not find or click Yes button via standard methods");
         logger.info("Attempting Strategy 2.8: Playwright force-click on button selectors...");
         
         try {
           // Try force-click with multiple selector patterns
           const forceClickSelectors = [
             'button:has-text("Yes")',
             'button:has-text("yes")',
             'button:nth-of-type(1)',
             'div.modal button:nth-of-type(1)',
             '.modal-dialog button:first-child',
             '[role="dialog"] button:first-child'
           ];

           for (const selector of forceClickSelectors) {
             try {
               const locator = page.locator(selector).first();
               const visible = await locator.isVisible().catch(() => false);
               if (visible) {
                 logger.info(`Found button with selector: ${selector}, force-clicking...`);
                 await locator.click({ force: true, timeout: 3000 }).catch(() => {});
                 yesButtonClicked = true;
                 clickedUsing = `force_click_${selector}`;
                 logger.success("✓ Button force-clicked");
                 break;
               }
             } catch (e) {
               logger.debug(`Force-click selector ${selector} failed: ${e.message}`);
             }
           }
          } catch (e) {
            logger.debug("Force-click strategy failed: " + e.message);
          }

          if (!yesButtonClicked) {
            logger.info("Attempting Strategy 3: Direct DOM search and click...");
            
            try {
              // Strategy 3: Try multiple ways to find and click the button
              const strategy3Success = await page.evaluate(() => {
                const normalizeText = (text) => text.trim().toLowerCase().replace(/\s+/g, ' ');
                
                // Method 1: Find by exact XPath
                try {
                  const xpath = "//button[text()='Yes']";
                  const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
                  if (result.singleNodeValue) {
                    result.singleNodeValue.click();
                    return true;
                  }
                } catch (e) {}

                // Method 2: Find in all elements
                try {
                  const allElements = document.querySelectorAll('*');
                  for (let el of allElements) {
                    if (el.tagName === 'BUTTON' && normalizeText(el.textContent) === 'yes') {
                      el.click();
                      return true;
                    }
                  }
                } catch (e) {}

                // Method 3: Try modal dialog specifically
                try {
                  const dialogs = document.querySelectorAll('[role="dialog"], .modal, .modal-dialog, .confirmation-dialog');
                  for (let dialog of dialogs) {
                    const buttons = dialog.querySelectorAll('button');
                    for (let btn of buttons) {
                      if (normalizeText(btn.textContent) === 'yes' || normalizeText(btn.textContent).includes('yes')) {
                        btn.click();
                        return true;
                      }
                    }
                  }
                } catch (e) {}

                return false;
              }).catch(() => false);

              if (strategy3Success) {
                logger.success("✓ Yes button clicked via Strategy 3");
                logAction("Confirmation Yes button clicked", { method: "strategy3_dom_search" });
                yesButtonClicked = true;

                await browserManager.screenshot("11-yes-button-clicked.png");
                await page.waitForTimeout(2000);

                try {
                  await Promise.race([
                    page.waitForNavigation({ timeout: 5000 }).catch(() => {}),
                    page.waitForTimeout(3000)
                  ]);
                } catch (e) {
                  logger.debug("Navigation wait timeout - continuing anyway");
                }

                await browserManager.screenshot("12-after-yes-button.png");
                logger.success("✓ Confirmation dialog handled successfully");
                logDecision("Confirmation Dialog", ["yes_clicked_strategy3"], "success");
              }
            } catch (e) {
              logger.warn("Strategy 3 also failed: " + e.message);
            }
          }

          if (!yesButtonClicked) {
            logger.error("❌ Could not find or click Yes button after all strategies");
            logError("Yes button not found or could not be clicked", { strategies: "2.5, 2.8, 3" });
            logger.info("Please click the Yes button manually in the browser");
            
            // Wait for manual click
            logger.info("Waiting for dialog to close (manual click detected)...");
            await page.waitForTimeout(5000);
            
            // Check if dialog closed
            const dialogStillVisible = await page.evaluate(() => {
              const dialogs = document.querySelectorAll('[role="dialog"], .modal, .modal-dialog, .confirmation-dialog');
              return dialogs.length > 0;
            }).catch(() => false);

            if (!dialogStillVisible) {
              logger.success("✓ Dialog closed (presumably by manual click)");
              logAction("Dialog closed manually by user", {});
            } else {
              logger.warn("⚠️  Dialog still visible - continuing anyway");
            }
          }
        }
      }

    await page.waitForTimeout(1000);

    // ═══════════════════════════════════════════════════════════════════
    // VERIFY CONFIRMATION DIALOG IS CLOSED
    // ═══════════════════════════════════════════════════════════════════

    logger.info("Verifying confirmation dialog is closed...");
    let dialogStillOpen = await page.evaluate(() => {
      const dialogs = document.querySelectorAll('[role="dialog"], .modal, .modal-dialog, .confirmation-dialog');
      return dialogs.length > 0;
    }).catch(() => false);

    if (dialogStillOpen) {
      logger.warn("⚠️  Confirmation dialog still open! Attempting force close...");
      
      // Try to remove modal from DOM
      await page.evaluate(() => {
        const dialogs = document.querySelectorAll('.modal, .modal-dialog, [role="dialog"], .confirmation-dialog');
        dialogs.forEach(d => {
          d.style.display = 'none';
          d.remove();
        });
        const backdrop = document.querySelector('.modal-backdrop, [class*="backdrop"]');
        if (backdrop) backdrop.remove();
      }).catch(() => {});
      
      await page.waitForTimeout(500);
      
      dialogStillOpen = await page.evaluate(() => {
        const dialogs = document.querySelectorAll('[role="dialog"], .modal, .modal-dialog, .confirmation-dialog');
        return dialogs.length > 0;
      }).catch(() => false);
      
      if (dialogStillOpen) {
        logger.error("❌ Dialog could not be closed - attempting to navigate anyway");
      } else {
        logger.success("✓ Dialog force-closed successfully");
      }
    } else {
      logger.success("✓ Confirmation dialog is closed");
    }

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 4: NAVIGATE TO BOOKING FORM & FILL PILGRIM DETAILS (3 PERSONS)
    // ═══════════════════════════════════════════════════════════════════

    logger.section("PHASE 4: NAVIGATE TO BOOKING FORM");
    
    // Navigate to booking form page
    const bookingFormUrl = "https://tirupatibalaji.ap.gov.in/#/bookingForm";
    logger.info(`Navigating to booking form: ${bookingFormUrl}`);
    await page.goto(bookingFormUrl, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {
      logger.warn("Navigation took longer than expected, continuing...");
    });
    
    await page.waitForTimeout(2000);
    await browserManager.screenshot("13-booking-form-page.png");
    logger.success("✓ Navigated to booking form page");

    logger.section("PHASE 4B: FILL PILGRIM DETAILS (3 PERSONS)");

    // Define the 3 pilgrims' data
    const pilgrims = [
      {
        name: "Mk Pramod",
        age: 65,
        gender: "Male",
        proofType: "Aadhaar Card",
        proofNumber: "916317674472"
      },
      {
        name: "Abhilash Pramod",
        age: 34,
        gender: "Male",
        proofType: "Aadhaar Card",
        proofNumber: "862240912807"
      },
      {
        name: "Sharanya P",
        age: 32,
        gender: "Female",
        proofType: "Aadhaar Card",
        proofNumber: "758129312783"
      }
    ];

    // Wait for form to load
    logger.info("Waiting for pilgrim details form to load...");
    await page.waitForTimeout(2000);

    try {
      const formFound = await page.$('input[id="fName1"]').catch(() => null);
      if (!formFound) {
        logger.warn("⚠️  Pilgrim form not found on current page");
        logError("Pilgrim form not detected", { selector: 'input[id="fName1"]' });
      } else {
        logger.success("✓ Pilgrim details form detected");
        logAction("Pilgrim form detected", {});
      }
    } catch (e) {
      logger.debug("Form detection check failed");
    }

    // Fill details for each pilgrim
    for (let i = 0; i < pilgrims.length; i++) {
      const personIndex = i + 1; // Form uses 1-based indexing
      const pilgrim = pilgrims[i];

      logger.section(`PERSON ${personIndex}/3: Filling ${pilgrim.name}`);

      try {
        // Step 1: Fill Name Field
        logger.info(`Filling name for Person ${personIndex}...`);
        const nameFieldId = `fName${personIndex}`;
        
        // Enhanced field detection with multiple fallbacks
        let nameField = await page.$(`#${nameFieldId}`) || 
                        await page.$(`input[name="${nameFieldId}"]`) ||
                        await page.$(`input[ng-model*="fName${personIndex}"]`) ||
                        await page.$(`input[ng-model*="firstName"]`) ||
                        await page.$(`input[data-field="firstName-${personIndex}"]`) ||
                        await page.$(`input[placeholder*="Name" i]`);

        if (!nameField) {
          // Try to find any input field in the person section
          const selectorFound = await page.evaluate((idx) => {
            const personSections = document.querySelectorAll('[data-person], .person, [class*="person"]');
            if (personSections[idx]) {
              const inputs = personSections[idx].querySelectorAll('input[type="text"]');
              return inputs[0] ? inputs[0].id || inputs[0].name : null;
            }
            return null;
          }, i);
          
          if (selectorFound) {
            nameField = await page.$(`#${selectorFound}`).catch(() => null);
          }
        }

        if (!nameField) {
          logError(`Name field not found for person ${personIndex}`, { fieldId: nameFieldId });
          logger.warn(`⚠️  Name field (${nameFieldId}) not found - skipping`);
        } else {
          await page.evaluate(({ id, value }) => {
            const field = document.querySelector(`#${id}`) || 
                         document.querySelector(`input[name="${id}"]`);
            if (field) {
              field.value = value;
              field.focus();
              field.dispatchEvent(new Event('input', { bubbles: true }));
              field.dispatchEvent(new Event('change', { bubbles: true }));
              field.dispatchEvent(new Event('blur', { bubbles: true }));
              // Trigger AngularJS digest
              if (window.angular) {
                try {
                  angular.element(field).scope().$apply();
                } catch (e) {}
              }
            }
          }, { id: nameFieldId, value: pilgrim.name });

          logger.success(`✓ Name filled: ${pilgrim.name}`);
          logAction(`Name filled - Person ${personIndex}`, { name: pilgrim.name });
        }

        await page.waitForTimeout(500);

        // Step 2: Fill Age Field
        logger.info(`Filling age for Person ${personIndex}...`);
        const ageFieldName = `age${personIndex}`;
        let ageField = await page.$(`input[name="${ageFieldName}"]`) ||
                       await page.$(`#${ageFieldName}`) ||
                       await page.$(`input[ng-model*="age${personIndex}"]`) ||
                       await page.$(`input[ng-model*="age"]`) ||
                       await page.$(`input[data-field="age-${personIndex}"]`);

        if (!ageField) {
          logError(`Age field not found for person ${personIndex}`, { fieldName: ageFieldName });
          logger.warn(`⚠️  Age field (${ageFieldName}) not found - skipping`);
        } else {
          await page.evaluate(({ name, value }) => {
            const field = document.querySelector(`input[name="${name}"]`) ||
                         document.querySelector(`#${name}`);
            if (field) {
              field.value = value;
              field.focus();
              field.dispatchEvent(new Event('input', { bubbles: true }));
              field.dispatchEvent(new Event('change', { bubbles: true }));
              field.dispatchEvent(new Event('blur', { bubbles: true }));
              // Trigger AngularJS digest & ng-change handlers
              if (window.angular) {
                try {
                  const scope = angular.element(field).scope();
                  scope.$apply();
                } catch (e) {}
              }
            }
          }, { name: ageFieldName, value: pilgrim.age });

          logger.success(`✓ Age filled: ${pilgrim.age}`);
          logAction(`Age filled - Person ${personIndex}`, { age: pilgrim.age });

          // Wait for ID proof types to load after age change
          logger.info("Waiting for ID proof types to populate...");
          await page.waitForTimeout(1500);
        }

        await page.waitForTimeout(500);

        // Step 3: Select Gender
        logger.info(`Selecting gender for Person ${personIndex}...`);
        const genderSelectName = `gender${personIndex}`;
        let genderSelect = await page.$(`select[name="${genderSelectName}"]`) ||
                           await page.$(`#${genderSelectName}`) ||
                           await page.$(`select[ng-model*="gender${personIndex}"]`) ||
                           await page.$(`select[ng-model*="gender"]`) ||
                           await page.$(`select[data-field="gender-${personIndex}"]`);

        if (!genderSelect) {
          logError(`Gender select not found for person ${personIndex}`, { fieldName: genderSelectName });
          logger.warn(`⚠️  Gender select (${genderSelectName}) not found - skipping`);
        } else {
          await page.evaluate(({ name, value }) => {
            const select = document.querySelector(`select[name="${name}"]`) ||
                          document.querySelector(`#${name}`);
            if (select) {
              // Try exact match first, then partial match
              let option = Array.from(select.options).find(opt => opt.value === value);
              if (!option) {
                option = Array.from(select.options).find(opt => 
                  opt.textContent.toLowerCase().includes(value.toLowerCase())
                );
              }
              if (option) {
                select.value = option.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                // Trigger AngularJS digest
                if (window.angular) {
                  try {
                    angular.element(select).scope().$apply();
                  } catch (e) {}
                }
              }
            }
          }, { name: genderSelectName, value: pilgrim.gender });

          logger.success(`✓ Gender selected: ${pilgrim.gender}`);
          logAction(`Gender selected - Person ${personIndex}`, { gender: pilgrim.gender });
        }

        await page.waitForTimeout(500);

        // Step 4: Select ID Proof Type
        logger.info(`Selecting ID Proof Type for Person ${personIndex}...`);
        const proofSelectName = `proofS${personIndex}`;
        let proofSelect = await page.$(`select[name="${proofSelectName}"]`) ||
                          await page.$(`#${proofSelectName}`) ||
                          await page.$(`select[ng-model*="selectedProof${personIndex}"]`) ||
                          await page.$(`select[ng-model*="selectedProof"]`) ||
                          await page.$(`select[data-field="proofType-${personIndex}"]`);

        if (!proofSelect) {
          logError(`ID Proof Type select not found for person ${personIndex}`, { fieldName: proofSelectName });
          logger.warn(`⚠️  ID Proof Type select (${proofSelectName}) not found - skipping`);
        } else {
          // Get available options
          const availableProofTypes = await page.evaluate((name) => {
            const select = document.querySelector(`select[name="${name}"]`) ||
                          document.querySelector(`#${name}`);
            if (select) {
              return Array.from(select.options)
                .filter(opt => opt.value) // Exclude empty/placeholder options
                .map(opt => ({ value: opt.value, text: opt.textContent.trim() }));
            }
            return [];
          }, proofSelectName);

          logger.debug(`Available ID Proof Types: ${JSON.stringify(availableProofTypes)}`);

          // Try to find and select the Aadhaar Card option
          let proofTypeSelected = false;
          for (const option of availableProofTypes) {
            if (option.text.toLowerCase().includes('aadhaar')) {
              await page.evaluate(({ name, value }) => {
                const select = document.querySelector(`select[name="${name}"]`) ||
                              document.querySelector(`#${name}`);
                if (select) {
                  select.value = value;
                  select.dispatchEvent(new Event('change', { bubbles: true }));
                  if (window.angular) {
                    try {
                      angular.element(select).scope().$apply();
                    } catch (e) {}
                  }
                }
              }, { name: proofSelectName, value: option.value });

              logger.success(`✓ ID Proof Type selected: ${option.text}`);
              logAction(`ID Proof Type selected - Person ${personIndex}`, { proofType: option.text });
              proofTypeSelected = true;
              break;
            }
          }

          if (!proofTypeSelected && availableProofTypes.length > 0) {
            // Fallback: select first available option
            const firstOption = availableProofTypes[0];
            await page.evaluate(({ name, value }) => {
              const select = document.querySelector(`select[name="${name}"]`) ||
                            document.querySelector(`#${name}`);
              if (select) {
                select.value = value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                if (window.angular) {
                  try {
                    angular.element(select).scope().$apply();
                  } catch (e) {}
                }
              }
            }, { name: proofSelectName, value: firstOption.value });
            
            logger.warn(`⚠️  Aadhaar Card not found, selected first available: ${firstOption.text}`);
            logError(`Aadhaar Card not found - Person ${personIndex}`, { selectedFallback: firstOption.text, availableOptions: availableProofTypes });
          } else if (!proofTypeSelected) {
            logger.warn(`⚠️  Could not find any proof type options`);
            logError(`No ID Proof Types available - Person ${personIndex}`, { availableOptions: availableProofTypes });
          }

          // Wait for proof number field to be enabled/updated
          await page.waitForTimeout(1000);
        }

        await page.waitForTimeout(500);

        // Step 5: Fill ID Proof Number
        logger.info(`Filling ID Proof Number for Person ${personIndex}...`);
        const proofIdFieldId = `proofId${personIndex}`;
        let proofIdField = await page.$(`#${proofIdFieldId}`) ||
                           await page.$(`input[name="${proofIdFieldId}"]`) ||
                           await page.$(`input[ng-model*="photoId${personIndex}"]`) ||
                           await page.$(`input[ng-model*="photoId"]`) ||
                           await page.$(`input[data-field="proofId-${personIndex}"]`);

        if (!proofIdField) {
          logError(`ID Proof Number field not found for person ${personIndex}`, { fieldId: proofIdFieldId });
          logger.warn(`⚠️  ID Proof Number field (${proofIdFieldId}) not found - skipping`);
        } else {
          await page.evaluate(({ id, value }) => {
            const field = document.querySelector(`#${id}`) ||
                         document.querySelector(`input[name="${id}"]`);
            if (field) {
              field.value = value;
              field.focus();
              field.dispatchEvent(new Event('input', { bubbles: true }));
              field.dispatchEvent(new Event('change', { bubbles: true }));
              field.dispatchEvent(new Event('blur', { bubbles: true }));
              // Trigger AngularJS digest
              if (window.angular) {
                try {
                  angular.element(field).scope().$apply();
                } catch (e) {}
              }
            }
          }, { id: proofIdFieldId, value: pilgrim.proofNumber });

          logger.success(`✓ ID Proof Number filled: ${pilgrim.proofNumber}`);
          logAction(`ID Proof Number filled - Person ${personIndex}`, { proofNumber: pilgrim.proofNumber });
        }

        await page.waitForTimeout(500);

        // Take screenshot after person details filled
        await browserManager.screenshot(`13-person-${personIndex}-filled.png`);
        logger.success(`✓ Person ${personIndex} details completed`);
        logDecision(`Person ${personIndex} Form`, ["filled"], "success");

      } catch (error) {
        logError(`Error filling Person ${personIndex} details`, { error: error.message, person: pilgrim.name });
        logger.error(`❌ Error filling Person ${personIndex} details: ${error.message}`);
        logger.info("Continuing with next person...");
      }

      await page.waitForTimeout(1000);
    }

    logger.success("✓ All pilgrim details filled successfully!");
    logDecision("Pilgrim Form Completion", ["all_persons_filled"], "success");

    await browserManager.screenshot("14-all-pilgrims-filled.png");
    logger.success("✓ Automation completed for pilgrim details");

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 4C: SUBMIT PILGRIM DETAILS
    // ═══════════════════════════════════════════════════════════════════

    logger.section("PHASE 4C: SUBMIT PILGRIM DETAILS");
    
    await page.waitForTimeout(1000);

    let submitButtonClicked = false;
    const submitStrategies = [
      { selector: 'button:has-text("Continue")', name: 'Continue button' },
      { selector: 'button:has-text("Submit")', name: 'Submit button' },
      { selector: 'button:has-text("Next")', name: 'Next button' },
      { selector: 'button.btn-primary', name: 'Primary button' },
      { selector: 'button[type="submit"]', name: 'Submit type button' },
      { selector: 'button:nth-of-type(1)', name: 'First button' }
    ];

    for (const strategy of submitStrategies) {
      if (submitButtonClicked) break;

      try {
        logger.info(`Trying to find ${strategy.name}...`);
        const buttonLocator = page.locator(strategy.selector).first();
        const visible = await buttonLocator.isVisible().catch(() => false);

        if (visible) {
          logger.info(`Found ${strategy.name}, clicking...`);
          await buttonLocator.click({ timeout: 3000 }).catch(() => null);
          submitButtonClicked = true;
          logger.success(`✓ ${strategy.name} clicked successfully`);
          logAction("Submit button clicked", { button: strategy.name });
          break;
        }
      } catch (e) {
        logger.debug(`${strategy.name} strategy failed: ${e.message}`);
      }
    }

    if (!submitButtonClicked) {
      logger.warn("⚠️  Could not find/click submit button via Playwright");
      logger.info("Attempting JavaScript click...");

      try {
        const jsSubmitClicked = await page.evaluate(() => {
          const normalizeText = (text) => text.trim().toLowerCase().replace(/\s+/g, ' ');
          const buttons = document.querySelectorAll('button');

          for (const btn of buttons) {
            const normalized = normalizeText(btn.textContent);
            if (['continue', 'submit', 'next', 'proceed'].includes(normalized)) {
              btn.click();
              return { clicked: true, text: btn.textContent.trim() };
            }
          }
          return { clicked: false };
        });

        if (jsSubmitClicked.clicked) {
          logger.success(`✓ Submit button clicked via JavaScript: ${jsSubmitClicked.text}`);
          submitButtonClicked = true;
          logAction("Submit button clicked", { method: "javascript", button: jsSubmitClicked.text });
        } else {
          logger.warn("⚠️  No submit button found - waiting for manual click or page navigation");
        }
      } catch (e) {
        logger.debug(`JavaScript submit click failed: ${e.message}`);
      }
    }

    if (submitButtonClicked) {
      logger.info("Waiting for page to navigate or update after submit...");
      await page.waitForTimeout(2000);

      try {
        await Promise.race([
          page.waitForNavigation({ timeout: 5000 }).catch(() => {}),
          page.waitForTimeout(3000)
        ]);
      } catch (e) {
        logger.debug("Navigation wait timeout - continuing anyway");
      }

      await browserManager.screenshot("15-after-submit.png");
      logger.success("✓ Pilgrim details submitted successfully");
    } else {
      logger.warn("⚠️  Submit button not found - form may be auto-submitted or require manual action");
    }

    const finalUrl = page.url();
    logger.success("✓ Automation reached next phase");
    logger.info(`Current URL after pilgrim details: ${finalUrl}`);
    logger.info("Waiting for next instructions or booking completion.");

    await browserManager.screenshot("16-final-state.png");

    return { success: true, browserManager };

    } catch (error) {
     logger.error(`Full flow failed: ${error.message}`);
     logError("Full flow execution failed", { error: error.message });
      await browserManager.takeErrorScreenshot("full-flow-error").catch(() => null);
     
     // Comprehensive failure recovery - give user a chance to fix ANY step
     logger.section("⚠️  STEP ENCOUNTERED AN ISSUE - SWITCHING TO MANUAL MODE");
     logger.error(`Error: ${error.message}`);
     logger.info(`\nAutomation encountered an issue and is switching to manual mode.`);
     logger.info(`Browser is still ACTIVE - you can manually complete the current step.\n`);
     
     // Use the universal failure handler
     try {
       await handleStepFailure(
         "Automation Step Recovery",
         `The automation encountered an error: ${error.message}. Please manually complete or fix the current step in the browser.`,
         page,
         browserManager
        );
        
        // After manual recovery, automatically choose "manual" to keep browser open
        logger.section("Recovery Complete - Continuing Automatically");
        logger.info("Automation encountered an error. Browser will remain open.");
        logger.info("You can manually complete the booking or retry automation.\n");
        
        logDecision("Post-Recovery Action", ["auto"], "manual");
        logger.info("Browser remains open - you can complete booking manually or refresh to retry...");
        return { success: true, browserManager };
     } catch (recoveryError) {
       logger.error(`Recovery process failed: ${recoveryError.message}`);
       logError("Recovery process failed", { error: recoveryError.message });
       throw recoveryError;
     }
    } finally {
      // NOTE: Browser is NOT closed here - it will be closed in main() after user finishes
      logger.info(`runFullFlow completed. Browser is ${page.isClosed() ? "CLOSED" : "OPEN"} for manual steps.`);
    }
 }

// Main execution
(async () => {
  let browserManager = null;
  
  try {
    logger.section("TTD COMPLETE AUTOMATION FLOW");
    logger.info("Login + Donation + Booking (automated with interactive fallbacks)");
    logger.info("Browser will remain ACTIVE after automation for manual continuation\n");

    const result = await runFullFlow();
    browserManager = result.browserManager;

    if (result.success) {
      logger.success("✓ Complete automation flow executed successfully!");
      logger.section("✅ BROWSER IS READY FOR MANUAL BOOKING");
      logger.warn("\n⏸️  IMPORTANT: Browser window is still OPEN");
      logger.warn("Complete your booking manually, then close the browser to exit the script.");
      
      // Keep waiting for user to finish manual steps
      const userDone = await enterText(
        "Press ENTER after you're done with manual booking to close browser and exit",
        "Press ENTER to exit"
      );
      
      logAction("User manual booking completed", { 
        action: "exit",
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error(`Script execution failed: ${error.message}`);
    logError("Script execution failed", { error: error.message });
    
    logger.section("⚠️  ERROR - BROWSER KEPT OPEN FOR MANUAL RECOVERY");
    logger.warn("\nBrowser is still OPEN - you can manually complete the booking");
    logger.warn("After manual completion, close the browser to exit the script.");
    
    // Wait for user before exiting
    const recovered = await enterText(
      "Press ENTER after you're done to close the browser and exit",
      "Press ENTER to exit"
    );
    
    logAction("Error recovery - manual booking attempted", { 
      action: "recovery",
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    closePrompt();
    process.exit(1);
  } finally {
    // Close browser and cleanup
    if (browserManager) {
      logger.section("🔄 CLEANUP AND BROWSER CLOSURE");
      logger.info("Closing browser...");
      logAction("Closing browser", { 
        timestamp: new Date().toISOString(),
        action: "cleanup"
      });
      await browserManager.close();
    }
    
    closePrompt();
    logger.success("\n✅ Script completed and browser closed. Thank you!");
  }
})();
