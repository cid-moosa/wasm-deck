import fs from 'node:fs';
import path from 'node:path';
import { launchBrowser } from '../e2e/cdp.mjs';

const BRAIN_DIR = 'C:/Users/CIDMOOSA/.gemini/antigravity/brain/0aa3183a-592f-4449-a153-9d20a2f8009d';

async function main() {
  const browser = await launchBrowser();
  try {
    await browser.navigate('http://localhost:5173/');
    await browser.sleep(1000);

    // Open settings dialog
    await browser.evaluate(`(() => {
      const btn = document.querySelector('.settings-trigger') || document.querySelector('[aria-label*="settings"]');
      if (btn) btn.click();
    })()`);
    await browser.sleep(600);

    // Scroll settings dialog to bottom to reveal Performance & Tuning
    await browser.evaluate(`(() => {
      const content = document.querySelector('[data-testid="settings-dialog-content"]');
      if (content) content.scrollTop = content.scrollHeight;
    })()`);
    await browser.sleep(400);

    const bottomBuf = await browser.screenshot();
    fs.writeFileSync(path.join(BRAIN_DIR, 'settings_bottom_contrast_verified.png'), bottomBuf);
    console.log('Saved settings_bottom_contrast_verified.png');
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
