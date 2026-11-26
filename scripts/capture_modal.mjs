import { launchBrowser } from '../e2e/cdp.mjs';
import fs from 'node:fs';

async function main() {
  const browser = await launchBrowser({ baseUrl: 'http://localhost:5173/', swiftshader: false });
  try {
    await browser.setViewport({ width: 1600, height: 1000 });
    await browser.navigate('http://localhost:5173/');
    await browser.sleep(2500);

    // Click first game card's launch button
    await browser.evaluate(`
      const btn = document.querySelector('.card-launch');
      if (btn) btn.click();
      else throw new Error('No .card-launch found');
    `);
    await browser.sleep(2000);

    const buf = await browser.screenshot();
    fs.writeFileSync('C:/Users/CIDMOOSA/.gemini/antigravity/brain/0aa3183a-592f-4449-a153-9d20a2f8009d/in_deck_modal_verified.png', buf);
    console.log('Successfully saved in_deck_modal_verified.png');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
