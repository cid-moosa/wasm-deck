import fs from 'node:fs';
import path from 'node:path';
import { launchBrowser } from '../e2e/cdp.mjs';

const BRAIN_DIR = 'C:/Users/CIDMOOSA/.gemini/antigravity/brain/0aa3183a-592f-4449-a153-9d20a2f8009d';

async function main() {
  const browser = await launchBrowser();
  try {
    console.log('Navigating to http://localhost:5173/ ...');
    await browser.navigate('http://localhost:5173/');
    await browser.sleep(1200);

    // Capture main portal baseline
    const portalBuf = await browser.screenshot();
    fs.writeFileSync(path.join(BRAIN_DIR, 'ascii_portal_multiscene.png'), portalBuf);
    console.log('Saved ascii_portal_multiscene.png');

    // Click settings trigger button
    await browser.evaluate(`(() => {
      const btn = document.querySelector('.settings-trigger') || document.querySelector('[aria-label*="settings"]');
      if (btn) btn.click();
    })()`);
    await browser.sleep(800);

    // Capture Settings Dialog showing contrast fix and new ASCII animation section
    const settingsBuf = await browser.screenshot();
    fs.writeFileSync(path.join(BRAIN_DIR, 'settings_dialog_contrast_verified.png'), settingsBuf);
    console.log('Saved settings_dialog_contrast_verified.png');

    // Verify active button styles programmatically
    const buttonDiagnostics = await browser.evaluate(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const activeFrameBtn = btns.find((b) => b.getAttribute('data-testid') === 'framerate-smooth');
      const activeDensityBtn = btns.find((b) => b.getAttribute('data-testid') === 'density-normal');
      
      const comp1 = activeFrameBtn ? window.getComputedStyle(activeFrameBtn) : null;
      const comp2 = activeDensityBtn ? window.getComputedStyle(activeDensityBtn) : null;

      return {
        frameBtn: comp1 ? { bg: comp1.backgroundColor, color: comp1.color, text: activeFrameBtn.textContent } : null,
        densityBtn: comp2 ? { bg: comp2.backgroundColor, color: comp2.color, text: activeDensityBtn.textContent } : null,
      };
    })()`);
    console.log('Button contrast diagnostics:', JSON.stringify(buttonDiagnostics, null, 2));

    // Switch to Matrix Rain
    await browser.evaluate(`(() => {
      const matrixBtn = document.querySelector('[data-testid="ascii-anim-matrix"]');
      if (matrixBtn) matrixBtn.click();
    })()`);
    await browser.sleep(500);

    // Close settings dialog to view matrix background
    await browser.evaluate(`(() => {
      const closeBtn = document.querySelector('[aria-label="Close settings"]') || document.querySelector('button.button--lime');
      if (closeBtn) closeBtn.click();
    })()`);
    await browser.sleep(1200);

    const matrixBuf = await browser.screenshot();
    fs.writeFileSync(path.join(BRAIN_DIR, 'ascii_matrix_rain_verified.png'), matrixBuf);
    console.log('Saved ascii_matrix_rain_verified.png');

    // Reopen settings and switch to Synthwave Grid
    await browser.evaluate(`(() => {
      const btn = document.querySelector('.settings-trigger') || document.querySelector('[aria-label*="settings"]');
      if (btn) btn.click();
    })()`);
    await browser.sleep(600);

    await browser.evaluate(`(() => {
      const wavesBtn = document.querySelector('[data-testid="ascii-anim-waves"]');
      if (wavesBtn) wavesBtn.click();
    })()`);
    await browser.sleep(500);

    await browser.evaluate(`(() => {
      const closeBtn = document.querySelector('[aria-label="Close settings"]') || document.querySelector('button.button--lime');
      if (closeBtn) closeBtn.click();
    })()`);
    await browser.sleep(1200);

    const wavesBuf = await browser.screenshot();
    fs.writeFileSync(path.join(BRAIN_DIR, 'ascii_synthwave_grid_verified.png'), wavesBuf);
    console.log('Saved ascii_synthwave_grid_verified.png');

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
