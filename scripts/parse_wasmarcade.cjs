const fs = require('fs');
const path = require('path');

// 1. Process Flash Games
try {
  let flashCode = fs.readFileSync(path.join(__dirname, 'flash.js'), 'utf8');
  flashCode = flashCode.replace(/import\s*[^;]+;/g, '');
  flashCode = flashCode.replace(/export\s*\{[^}]+\};?/g, '');
  
  // Wrap in function to extract r
  const fn = new Function(flashCode + '\nreturn r;');
  const flashGames = fn();
  console.log('Successfully extracted Flash games:', flashGames.length);
  fs.writeFileSync(path.join(__dirname, 'extracted_flash.json'), JSON.stringify(flashGames, null, 2));
} catch (err) {
  console.error('Flash error:', err);
}

// 2. Process Emu (Retro) Games
try {
  let emuCode = fs.readFileSync(path.join(__dirname, 'emu.js'), 'utf8');
  // Mock imported symbols
  // import{t as e}from"./systems.gen-CeYDQR2d.js";
  // import"./paths-CO6DDzAp.js";
  // import"./systems-g1Mb7wEi.js";
  // import{S as t}from"./index-V5lAWSu-.js";
  // import{n}from"./genres-D52u3jmg.js";
  emuCode = emuCode.replace(/import\s*[^;]+;/g, '');
  emuCode = emuCode.replace(/export\s*\{[^}]+\};?/g, '');

  const mockHeader = `
    const e = [
      {id:'cps1', label:'Arcade · CPS1', core:'fbneo', count:20},
      {id:'cps2', label:'Arcade · CPS2', core:'fbneo', count:36},
      {id:'cps3', label:'Arcade · CPS3', core:'fbneo', count:6},
      {id:'neogeo', label:'Neo Geo', core:'fbneo', count:90},
      {id:'arcade', label:'Arcade', core:'fbneo', count:75}
    ];
    const t = (sys) => sys;
    const n = {};
  `;
  const fn = new Function(mockHeader + '\n' + emuCode + '\nreturn f;');
  const emuGames = fn();
  console.log('Successfully extracted Retro games:', emuGames.length);
  fs.writeFileSync(path.join(__dirname, 'extracted_retro.json'), JSON.stringify(emuGames, null, 2));
} catch (err) {
  console.error('Emu error:', err);
}
