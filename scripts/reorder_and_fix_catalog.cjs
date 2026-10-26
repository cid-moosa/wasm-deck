const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '../src/data/gamesData.js');
const { VERIFIED_WASM_GAMES } = require(catalogPath);

const POPULAR_ORDER_IDS = [
  "gta-5-wasm",
  "gta-vice-city",
  "gta-iii",
  "minecraft-eaglercraft-wasm",
  "cod-bo1-zombies",
  "among-us-web",
  "counter-strike-16",
  "cyberpunk-2077-web",
  "simpsons-hit-and-run",
  "nfs-most-wanted-2005",
  "nfs-underground-2",
  "super-mario-64",
  "super-smash-bros",
  "halo-combat-evolved",
  "team-fortress-2",
  "tekken-5-dark-resurrection",
  "classic-doom-webprboom",
  "hollow-knight",
  "space-cadet-pinball",
  "flatout-2",
  "cs-source-bhop",
  "counter-strike-surf",
  "diablo-1996",
  "super-monkey-ball",
  "crash-bash",
  "pes-6",
  "pes-2011",
  "quake-2",
  "ddlc-plus",
  "minecraft-classic",
  "nhl-94"
];

const THUMBNAIL_FIXES = {
  "gta-5-wasm": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/271590/header.jpg",
  "gta-vice-city": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/12110/header.jpg",
  "gta-iii": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/12100/header.jpg",
  "minecraft-eaglercraft-wasm": "https://wasmarcade.com/covers/minecraft-896.webp",
  "cod-bo1-zombies": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/42700/header.jpg",
  "among-us-web": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/945360/header.jpg",
  "counter-strike-16": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/10/header.jpg",
  "cyberpunk-2077-web": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1091500/header.jpg",
  "simpsons-hit-and-run": "https://wasmarcade.com/covers/hit-and-run-896.webp",
  "nfs-most-wanted-2005": "./covers/nfs-most-wanted-2005.jpg",
  "nfs-underground-2": "./covers/nfs-underground-2.jpg",
  "super-mario-64": "./covers/super-mario-64.jpg",
  "super-smash-bros": "./covers/super-smash-bros.jpg",
  "halo-combat-evolved": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1064221/header.jpg",
  "team-fortress-2": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/440/header.jpg",
  "tekken-5-dark-resurrection": "./covers/tekken-5-dark-resurrection.jpg",
  "classic-doom-webprboom": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2280/header.jpg",
  "classic-doom-silent": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2300/header.jpg",
  "hollow-knight": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/367520/header.jpg",
  "space-cadet-pinball": "./covers/space-cadet-pinball.jpg",
  "flatout-2": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2990/header.jpg",
  "cs-source-bhop": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/240/header.jpg",
  "counter-strike-surf": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/240/header.jpg",
  "diablo-1996": "./covers/diablo-1996.jpg",
  "super-monkey-ball": "./covers/super-monkey-ball.jpg",
  "crash-bash": "./covers/crash-bash.jpg",
  "pes-6": "./covers/pes-football.jpg",
  "pes-2011": "./covers/pes-football.jpg",
  "nhl-94": "./covers/nhl-94.jpg",
  "quake-1-netquake": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2310/header.jpg",
  "quake-2": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2320/header.jpg",
  "ddlc-plus": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1388880/header.jpg",
  "night-in-the-woods": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/481510/header.jpg",
  "descent-1": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/273570/header.jpg",
  "beneath-a-steel-sky": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1368340/header.jpg",
  "super-mario-zombies": "./covers/super-mario-64.jpg",
  "minecraft-classic": "https://wasmarcade.com/covers/minecraft-896.webp"
};

// 1. Apply fixes to all games
const gamesMap = new Map();
VERIFIED_WASM_GAMES.forEach(g => {
  const updated = { ...g };
  if (THUMBNAIL_FIXES[g.id]) {
    updated.thumbnailUrl = THUMBNAIL_FIXES[g.id];
  }
  if (POPULAR_ORDER_IDS.includes(g.id)) {
    updated.popular = true;
  }
  gamesMap.set(g.id, updated);
});

// 2. Build sorted array with popular games first in the designated order
const popularGames = [];
POPULAR_ORDER_IDS.forEach(id => {
  if (gamesMap.has(id)) {
    popularGames.push(gamesMap.get(id));
    gamesMap.delete(id);
  }
});

// The remaining games preserve their category order
const remainingGames = Array.from(gamesMap.values());
const allUpdatedGames = [...popularGames, ...remainingGames];

const fileHeader = `/**
 * WASM//DECK Master Verified Games Catalog
 * Total Verified Working Games: ${allUpdatedGames.length}
 * Contains popular games prioritized first with authentic verified artwork.
 */

export const VERIFIED_WASM_GAMES = ${JSON.stringify(allUpdatedGames, null, 2)};

export const CATEGORIES = [
  { id: 'all', label: 'All Verified Ports' },
  { id: 'popular', label: '🔥 Popular' },
  { id: 'aaa-console', label: 'AAA & Console' },
  { id: 'nintendo-decomp', label: 'Nintendo Decomps' },
  { id: 'classic-pc', label: 'Classic PC' },
  { id: 'retro-arcade', label: 'Retro Arcade (FBNeo)' },
  { id: 'flash-classics', label: 'Flash Classics (Ruffle)' },
  { id: 'modern-indie', label: 'Modern Indie' },
  { id: 'hubs', label: 'Port Hubs' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'recent', label: 'Recently Played' }
];

export const DELIVERY_MODES = [
  { id: 'all', label: 'All Delivery' },
  { id: 'Instant Stream', label: 'Instant Stream', desc: 'Pre-packaged WebAssembly games with assets pre-cached' },
  { id: 'BYO-ROM', label: 'BYO-ROM / ISO', desc: 'WebAssembly emulators where you load your own game file' },
  { id: 'GitHub Source', label: 'Self-Host Source', desc: 'Direct source repo for local compiling and running' }
];

export const QUARANTINED_DOMAINS = [
  { domain: "playgta5online.fake.ru", threat: "Adware & survey lock", date: "2026-10-24", status: "BLOCKED" },
  { domain: "free-minecraft-wasm.download", threat: "Executable malware dropper", date: "2026-10-24", status: "BLOCKED" },
  { domain: "simpsons-browser-direct.com", threat: "Cryptojacking miner script", date: "2026-10-24", status: "BLOCKED" },
  { domain: "halo-web-installer.exe.xyz", threat: "Trojan disguised as WASM installer", date: "2026-10-24", status: "BLOCKED" },
  { domain: "cod-zombies-free-coins.top", threat: "Phishing credential harvester", date: "2026-10-24", status: "BLOCKED" }
];
`;

fs.writeFileSync(catalogPath, fileHeader, 'utf8');
console.log(`Successfully updated and reordered ${allUpdatedGames.length} games. ${popularGames.length} popular games prioritized at top.`);
