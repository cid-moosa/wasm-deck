import { launchBrowser } from '../e2e/cdp.mjs';
import fs from 'node:fs';

async function main() {
  const browser = await launchBrowser({ baseUrl: 'https://cid-moosa.github.io/wasm-deck/', swiftshader: false });
  try {
    await browser.setViewport({ width: 1440, height: 900 });
    await browser.navigate('https://cid-moosa.github.io/wasm-deck/');
    await browser.sleep(3000);

    const livePic = 'C:\\Users\\CIDMOOSA\\.gemini\\antigravity\\brain\\0aa3183a-592f-4449-a153-9d20a2f8009d\\live_github_pages_verified.png';
    const buf = await browser.screenshot();
    fs.writeFileSync(livePic, buf);
    console.log('Saved live site screenshot to', livePic);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
