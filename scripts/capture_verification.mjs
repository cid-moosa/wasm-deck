import { launchBrowser } from '../e2e/cdp.mjs';
import fs from 'node:fs';

async function main() {
  const browser = await launchBrowser({ baseUrl: 'http://localhost:5173/', swiftshader: false });
  try {
    await browser.setViewport({ width: 1600, height: 1000 });
    await browser.navigate('http://localhost:5173/');
    await browser.sleep(2500);

    // 1. Cool HUD Dock
    let buf = await browser.screenshot();
    fs.writeFileSync('C:/Users/CIDMOOSA/.gemini/antigravity/brain/0aa3183a-592f-4449-a153-9d20a2f8009d/cool_hud_dock_verified.png', buf);
    console.log('Saved cool_hud_dock_verified.png');

    // 2. Scroll to bottom
    await browser.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await browser.sleep(1500);
    buf = await browser.screenshot();
    fs.writeFileSync('C:/Users/CIDMOOSA/.gemini/antigravity/brain/0aa3183a-592f-4449-a153-9d20a2f8009d/all_games_window_verified.png', buf);
    console.log('Saved all_games_window_verified.png');

    // 3. Open in-deck player modal in same window
    await browser.evaluate('window.scrollTo(0, 800)');
    await browser.sleep(800);
    await browser.evaluate(`
      const btn = document.querySelector('.card-launch');
      if (btn) btn.click();
    `);
    await browser.sleep(2500);
    buf = await browser.screenshot();
    fs.writeFileSync('C:/Users/CIDMOOSA/.gemini/antigravity/brain/0aa3183a-592f-4449-a153-9d20a2f8009d/in_deck_single_window_verified.png', buf);
    console.log('Saved in_deck_single_window_verified.png');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
