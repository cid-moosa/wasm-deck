import { launchBrowser } from '../e2e/cdp.mjs';
import fs from 'node:fs';

async function main() {
  const browser = await launchBrowser({ baseUrl: 'http://localhost:5173/', swiftshader: false });
  try {
    await browser.setViewport({ width: 1440, height: 900 });
    await browser.navigate('http://localhost:5173/');
    await browser.sleep(1500);

    await browser.evaluate(`
      const btn = document.querySelector('[data-testid="open-settings-button"]') || document.querySelector('.settings-trigger');
      if (btn) btn.click();
    `);
    await browser.sleep(1000);

    await browser.evaluate(`
      const dialog = document.querySelector('[data-testid="settings-dialog-content"]');
      if (dialog) dialog.scrollTop = dialog.scrollHeight;
    `);
    await browser.sleep(600);

    const settingsBottomPic = 'C:\\Users\\CIDMOOSA\\.gemini\\antigravity\\brain\\0aa3183a-592f-4449-a153-9d20a2f8009d\\settings_bottom_contrast_fixed_verified.png';
    const sBuf = await browser.screenshot();
    fs.writeFileSync(settingsBottomPic, sBuf);
    console.log('Saved scrolled settings screenshot to', settingsBottomPic);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
