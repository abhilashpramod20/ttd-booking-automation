import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  console.log("Opening TTD website...");
  await page.goto("https://tirupatibalaji.ap.gov.in/#/userLogin", { waitUntil: "networkidle" });

  console.log("\nWaiting 5 seconds for page to fully load...");
  await page.waitForTimeout(5000);

  console.log("\nFinding all input fields on the page...");
  const inputs = await page.locator("input").all();
  console.log(`Found ${inputs.length} input elements:\n`);

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const type = await input.getAttribute("type");
    const name = await input.getAttribute("name");
    const id = await input.getAttribute("id");
    const placeholder = await input.getAttribute("placeholder");
    const ngModel = await input.getAttribute("ng-model");
    
    console.log(`Input ${i}:`);
    console.log(`  type: ${type}`);
    console.log(`  name: ${name}`);
    console.log(`  id: ${id}`);
    console.log(`  placeholder: ${placeholder}`);
    console.log(`  ng-model: ${ngModel}`);
    console.log("");
  }

  console.log("Finding all buttons...");
  const buttons = await page.locator("button").all();
  console.log(`Found ${buttons.length} buttons:\n`);

  for (let i = 0; i < Math.min(buttons.length, 5); i++) {
    const btn = buttons[i];
    const text = await btn.textContent();
    const type = await btn.getAttribute("type");
    console.log(`Button ${i}: "${text?.trim()}" (type: ${type})`);
  }

  console.log("\nHTML of login form area:");
  const formHtml = await page.locator("form, .login, .login-form, [role='main']").first().innerHTML().catch(() => "Not found");
  console.log(formHtml.substring(0, 500));

  console.log("\nPage title:", await page.title());
  console.log("Current URL:", page.url());

  // Keep browser open for 30 seconds so you can inspect manually
  console.log("\nBrowser will stay open for 30 seconds...");
  await page.waitForTimeout(30000);

  await browser.close();
})();
