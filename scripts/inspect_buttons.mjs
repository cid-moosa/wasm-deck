import { launchBrowser } from '../e2e/cdp.mjs';

async function main() {
  const browser = await launchBrowser();
  try {
    await browser.navigate('http://localhost:5173/');
    await browser.sleep(1000);
    await browser.evaluate(() => {
      const el = document.querySelector('.settings-trigger') || document.querySelector('[aria-label*="settings"]');
      if (el) el.click();
    });
    await browser.sleep(600);
    const styles = await browser.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const activeBtn = btns.find(b => b.textContent && b.textContent.includes('Smooth'));
      if (!activeBtn) return null;
      const comp = window.getComputedStyle(activeBtn);
      return {
        className: activeBtn.className,
        backgroundColor: comp.backgroundColor,
        color: comp.color,
        limeVar: getComputedStyle(document.documentElement).getPropertyValue('--lime'),
        limeInkVar: getComputedStyle(document.documentElement).getPropertyValue('--lime-ink')
      };
    });
    console.log('Button styles:', JSON.stringify(styles));
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
