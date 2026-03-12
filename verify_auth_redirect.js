const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    console.log('Navigating to home page...');
    await page.goto('http://localhost:3000');

    // Find a trade button on the home page (CompactTokenCard)
    console.log('Looking for trade button...');
    await page.waitForSelector('button:has-text("TRADE")', { timeout: 10000 });
    const tradeButton = await page.locator('button:has-text("TRADE")').first();

    console.log('Clicking trade button...');
    await tradeButton.click();

    // It should show the login modal first (as we are not logged in)
    console.log('Checking for login modal...');
    await page.waitForSelector('text=AUTHENTICATION REQUIRED', { timeout: 5000 });

    // Now look for the AuthButton in the modal
    const authButton = await page.locator('button:has-text("SIGN IN")').first();
    console.log('Clicking SIGN IN button in modal...');
    await authButton.click();

    // It should navigate to /auth
    console.log('Waiting for navigation to /auth...');
    await page.waitForURL('**/auth', { timeout: 5000 });

    console.log('Current URL:', page.url());

    await page.screenshot({ path: 'auth_page_redirect_verified.png', fullPage: true });
    console.log('Auth page redirect verified and screenshot saved.');

  } catch (error) {
    console.error('Verification failed:', error);
    await page.screenshot({ path: 'verification_error.png' });
  } finally {
    await browser.close();
  }
})();
