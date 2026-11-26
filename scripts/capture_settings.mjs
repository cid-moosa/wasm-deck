import { launchBrowser } from '../e2e/cdp.mjs';
import fs from 'node:fs';

async function main() {
  console.log('Launching Edge browser...');
  const browser = await launchBrowser({
    baseUrl: 'http://localhost:5173/',
    swiftshader: false,
  });

  try {
    await browser.setViewport({ width: 1600, height: 1000 });
    console.log('Navigating to http://localhost:5173/ ...');
    await browser.navigate('http://localhost:5173/');
    await browser.sleep(2500);

    console.log('Clicking settings button ...');
    await browser.evaluate(`
      const btn = document.querySelector('[data-testid="settings-trigger"]') || document.querySelector('.settings-trigger');
      if (btn) btn.click();
      else throw new Error('Settings button not found');
    `);
    await browser.sleep(1500);

    const screenshotPath = 'C:\\Users\\CIDMOOSA\\.gemini\\antigravity\\brain\\0aa3183a-592f-4449-a153-9d20a2f8009d\\wasmdeck_settings_dialog_verified.png';
    console.log('Capturing screenshot to', screenshotPath);
    const buf = await browser.screenshot();
    fs.writeFileSync(screenshotPath, buf);
    console.log('Saved settings dialog screenshot successfully!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
