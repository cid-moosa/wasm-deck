import { launchBrowser } from '../e2e/cdp.mjs';
import fs from 'node:fs';

async function main() {
  const browser = await launchBrowser({ baseUrl: 'http://localhost:5173/', swiftshader: false });
  try {
    await browser.setViewport({ width: 1440, height: 900 });
    await browser.navigate('http://localhost:5173/');
    await browser.sleep(2000);

    // 1. Capture Settings Dialog contrast
    console.log('Opening settings dialog...');
    await browser.evaluate(`
      const btn = document.querySelector('[data-testid="open-settings-button"]') || document.querySelector('.settings-trigger');
      if (btn) btn.click();
    `);
    await browser.sleep(1200);

    const settingsPic = 'C:\\Users\\CIDMOOSA\\.gemini\\antigravity\\brain\\0aa3183a-592f-4449-a153-9d20a2f8009d\\settings_contrast_fixed_verified.png';
    const sBuf = await browser.screenshot();
    fs.writeFileSync(settingsPic, sBuf);
    console.log('Saved settings screenshot to', settingsPic);

    // Close settings dialog
    await browser.evaluate(`
      const closeBtn = document.querySelector('[aria-label="Close settings"]') || document.querySelector('.close-dialog');
      if (closeBtn) closeBtn.click();
    `);
    await browser.sleep(800);

    // 2. Trigger Easter Egg feeding
    console.log('Triggering feeding easter egg...');
    await browser.evaluate(`
      const feedBtn = document.querySelector('[data-testid="floating-feed-button"]') || document.querySelector('.floating-feed-pill');
      if (feedBtn) {
        feedBtn.click();
      } else {
        window.dispatchEvent(new CustomEvent('wasmdeck:feed-koi', { detail: { x: 720, y: 450, count: 6 } }));
      }
    `);
    await browser.sleep(400);

    const easterEggPic = 'C:\\Users\\CIDMOOSA\\.gemini\\antigravity\\brain\\0aa3183a-592f-4449-a153-9d20a2f8009d\\koi_feeding_easter_egg_fixed_verified.png';
    const eBuf = await browser.screenshot();
    fs.writeFileSync(easterEggPic, eBuf);
    console.log('Saved easter egg screenshot to', easterEggPic);

  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
