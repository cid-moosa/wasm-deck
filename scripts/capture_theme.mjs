import fs from 'node:fs';
import { launchBrowser } from '../e2e/cdp.mjs';

async function main() {
  const browser = await launchBrowser();
  try {
    await browser.navigate('http://localhost:5173/');
    await browser.sleep(2000);

    const outDir = 'C:/Users/CIDMOOSA/.gemini/antigravity/brain/1b7b4bb1-229d-4069-8821-16ce39e523ba';

    // 1. Full portal screenshot
    const portalBuf = await browser.screenshot();
    fs.writeFileSync(`${outDir}/ascii_portal_verified.png`, portalBuf);
    console.log('Saved ascii_portal_verified.png');

    // 2. Open settings
    await browser.evaluate('document.querySelector("[data-testid=\\"open-settings-button\\"]")?.click()');
    await browser.sleep(1000);

    const settingsBuf = await browser.screenshot();
    fs.writeFileSync(`${outDir}/theme_settings_dialog_verified.png`, settingsBuf);
    console.log('Saved theme_settings_dialog_verified.png');

    // 3. Click Cyber Cyan
    await browser.evaluate('document.querySelector("[data-testid=\\"accent-btn-cyan\\"]")?.click()');
    await browser.sleep(800);

    const cyanBuf = await browser.screenshot();
    fs.writeFileSync(`${outDir}/cyber_cyan_theme_verified.png`, cyanBuf);
    console.log('Saved cyber_cyan_theme_verified.png');
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
