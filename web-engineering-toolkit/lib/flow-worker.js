import fs from 'node:fs';
import { chromium } from 'playwright-core';

const [portArg, scriptPath] = process.argv.slice(2);
const port = Number(portArg);
const source = fs.readFileSync(scriptPath, 'utf8');

let browser;
try {
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const contexts = browser.contexts();
  const context = contexts[0];
  if (!context) throw new Error('No browser context found on the CDP session.');
  let pages = context.pages();
  const page = pages[0] || await context.newPage();

  // Deliberately advanced/local-only. User-supplied code runs in an isolated child process,
  // but it still has Node.js privileges. The UI warns users accordingly.
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const run = new AsyncFunction('page', 'context', 'browser', 'console', source);
  await run(page, context, browser, console);
  console.log('Setup flow completed.');
  // Keep the remote browser alive; Lighthouse runs immediately after this setup flow.
  process.exit(0);
} catch (error) {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
}
