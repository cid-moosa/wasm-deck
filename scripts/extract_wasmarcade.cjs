const fs = require('fs');
const path = require('path');

async function main() {
  console.log('Fetching bundles from wasmarcade.com...');
  const emuText = await (await fetch('https://wasmarcade.com/assets/emu-CvyEe6KZ.js')).text();
  const flashText = await (await fetch('https://wasmarcade.com/assets/flash-B0gTR92O.js')).text();

  fs.writeFileSync(path.join(__dirname, 'emu.js'), emuText);
  fs.writeFileSync(path.join(__dirname, 'flash.js'), flashText);
  console.log('Saved raw files to scripts/emu.js and scripts/flash.js');
}

main().catch(console.error);
