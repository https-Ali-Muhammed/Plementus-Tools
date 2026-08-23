// Paste the body of this file into the "Session setup flow" field.
// Available variables: page, context, browser.

await page.goto('https://tavernatest.odoo.com/events', { waitUntil: 'domcontentloaded' });

// Add your real project-specific selectors here.
// Example:
// await page.getByRole('button', { name: /book|buy|add/i }).first().click();
// await page.waitForURL('**/shop/cart');
// await page.getByRole('button', { name: /checkout|continue/i }).click();
// await page.waitForURL('**/shop/payment');

console.log('Example flow reached:', page.url());
