const fs = require('fs');
const path = require('path');

const EXACT_THUMBNAILS = {
  // AAA Console & Open World
  "gta-5-wasm": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/271590/header.jpg",
  "gta-vice-city": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/12120/header.jpg",
  "gta-iii": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/12100/header.jpg",
  "simpsons-hit-and-run": "https://wasmarcade.com/covers/hit-and-run-896.webp",
  "cod-bo1-zombies": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/42700/header.jpg",
  "halo-combat-evolved": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1064270/header.jpg",
  "nfs-most-wanted-2005": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7o.jpg",
  "nfs-underground-2": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7m.jpg",
  "pes-6": "https://images.igdb.com/igdb/image/upload/t_cover_big/co2e2v.jpg",
  "pes-2011": "https://images.igdb.com/igdb/image/upload/t_cover_big/co2e2w.jpg",
  "team-fortress-2": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/440/header.jpg",
  "tekken-5-dark-resurrection": "https://images.igdb.com/igdb/image/upload/t_cover_big/co23a2.jpg",
  "cyberpunk-2077-web": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1091500/header.jpg",
  "flatout-2": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2990/header.jpg",

  // Nintendo Decompilations & N64
  "super-mario-64": "https://images.igdb.com/igdb/image/upload/t_cover_big/co2163.jpg",
  "super-smash-bros": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x6u.jpg",
  "super-monkey-ball": "https://images.igdb.com/igdb/image/upload/t_cover_big/co2v0h.jpg",
  "super-mario-zombies": "https://images.igdb.com/igdb/image/upload/t_cover_big/co2163.jpg",
  "crash-bash": "https://images.igdb.com/igdb/image/upload/t_cover_big/co25l0.jpg",
  "nhl-94": "https://images.igdb.com/igdb/image/upload/t_cover_big/co2e30.jpg",
  "zelda-oot": "https://images.igdb.com/igdb/image/upload/t_cover_big/co5ziy.jpg",
  "zelda-majoras-mask": "https://images.igdb.com/igdb/image/upload/t_cover_big/co5zix.jpg",
  "zelda-alttp": "https://images.igdb.com/igdb/image/upload/t_cover_big/co5ziv.jpg",
  "super-mario-world": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x6w.jpg",
  "pokemon-emerald": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x6z.jpg",
  "pokemon-firered": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x70.jpg",

  // Classic PC Ports
  "counter-strike-16": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/10/header.jpg",
  "counter-strike-surf": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/240/header.jpg",
  "counter-strike-source-bhop": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/240/header.jpg",
  "quake-1": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2310/header.jpg",
  "quake-2": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2320/header.jpg",
  "quake-3-arena": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2200/header.jpg",
  "left-4-dead": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/500/header.jpg",
  "portal-1": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/400/header.jpg",
  "half-life-1": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/70/header.jpg",
  "doom-1-prboom": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2280/header.jpg",
  "diablo-1": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x76.jpg",
  "fallout-1": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/38400/header.jpg",
  "fallout-2": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/38410/header.jpg",
  "heroes-of-might-and-magic-2": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x77.jpg",
  "heroes-of-might-and-magic-3": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/297000/header.jpg",
  "command-and-conquer-red-alert": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1213210/header.jpg",
  "openttd": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1536610/header.jpg",
  "openrct2": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/285330/header.jpg",
  "starcraft-wasm": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7v.jpg",
  "warcraft-2": "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x7a.jpg",

  // Modern Indie & Web Masters
  "celeste-classic": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/504230/header.jpg",
  "balatro-web": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2379780/header.jpg",
  "crosscode": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/368340/header.jpg",
  "vvvvvv": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/70300/header.jpg",
  "super-meat-boy": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/40800/header.jpg",
  "sonic-mania": "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/584400/header.jpg"
};

const catalogPath = path.join(__dirname, '../src/data/gamesData.js');
let content = fs.readFileSync(catalogPath, 'utf8');

// Parse games array from file
const { VERIFIED_WASM_GAMES } = require('../src/data/gamesData.js');
let updatedCount = 0;

const updatedGames = VERIFIED_WASM_GAMES.map(game => {
  if (EXACT_THUMBNAILS[game.id]) {
    updatedCount++;
    return {
      ...game,
      thumbnailUrl: EXACT_THUMBNAILS[game.id]
    };
  }
  return game;
});

const fileHeader = `/**
 * WASM//DECK Master Verified Games Catalog
 * Total Verified Working Games: ${updatedGames.length}
 * Contains user's verified working list with authentic Steam/boxart covers + wasmarcade.com
 */

export const VERIFIED_WASM_GAMES = ${JSON.stringify(updatedGames, null, 2)};

export const CATEGORIES = [
  { id: 'all', label: 'All Verified Ports' },
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
`;

fs.writeFileSync(catalogPath, fileHeader, 'utf8');
console.log(`Successfully updated ${updatedCount} games with authentic Steam/official boxart thumbnails!`);
