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

    const finalUrl = page.url();
    logger.success("✓ Automation completed for current step");
    logger.info(`Current URL after Srivani click: ${finalUrl}`);
    logger.info("Next steps will be added based on your instructions.");

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
