import { chromium } from 'playwright';
import fs from 'fs';

async function debugHTML() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://tirupatibalaji.ap.gov.in/#/SrivaniDonationConfirm', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Get the full HTML
    const html = await page.content();
    
    // Extract only the form section (after "Donation Amount")
    const donationFormMatch = html.match(/Donation Amount[\s\S]*?<\/form>/i);
    if (donationFormMatch) {
      fs.writeFileSync('donation-form-html.txt', donationFormMatch[0]);
      console.log('✅ Donation form HTML saved to: donation-form-html.txt');
      console.log('');
      console.log('DONATION FORM SECTION:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(donationFormMatch[0].substring(0, 3000));
      console.log('...');
    }

  } catch (error) {
    console.error(`Error: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

debugHTML();
