import { launchBrowser } from '../e2e/cdp.mjs';
import fs from 'node:fs';

async function main() {
  const browser = await launchBrowser({ baseUrl: 'http://localhost:5173/', swiftshader: false });
  try {
    await browser.setViewport({ width: 1600, height: 1000 });
    await browser.navigate('http://localhost:5173/');
    await browser.sleep(2500);

    // Trigger feeding easter egg by clicking the 563 PORTS badge
    console.log('Triggering feeding easter egg...');
    await browser.evaluate(`
      const badge = document.querySelector('.brand-badge--interactive') || document.querySelector('.brand-badge');
      if (badge) badge.click();
      else throw new Error('Badge not found');
    `);
    
    // Also dispatch a feed event in the open pond area to drop visible pellets
    await browser.evaluate(`
      window.dispatchEvent(new CustomEvent('wasmdeck:feed-koi', {
        detail: { x: 750, y: 480, count: 6 }
      }));
    `);

    await browser.sleep(600);

    const buf = await browser.screenshot();
    fs.writeFileSync('C:/Users/CIDMOOSA/.gemini/antigravity/brain/0aa3183a-592f-4449-a153-9d20a2f8009d/koi_feeding_easter_egg_verified.png', buf);
    console.log('Saved koi_feeding_easter_egg_verified.png successfully!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
