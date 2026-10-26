const fs = require('fs');
const path = require('path');

async function testUrl(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(url, { 
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: controller.signal 
    });
    clearTimeout(timeout);
    // Allow 200, 301, 302, 403 (some CDNs block automated head), but reject 404, 500, 526
    if (res.status === 404 || res.status >= 500) {
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}

async function run() {
  console.log('Testing wasmarcade base routes...');
  const baseTests = [
    'https://wasmarcade.com/vice-city',
    'https://wasmarcade.com/gta-5',
    'https://wasmarcade.com/gta3',
    'https://wasmarcade.com/simpsons',
    'https://wasmarcade.com/minecraft'
  ];

  for (const u of baseTests) {
    const ok = await testUrl(u);
    console.log(u, ok ? 'WORKING' : 'NOT WORKING');
  }
}

run();
