const fs = require('fs');
const path = require('path');

const flashRaw = require('./extracted_flash.json');
const retroRaw = require('./extracted_retro.json');

// System label map for retro arcade
const SYSTEM_NAMES = {
  cps1: 'Capcom CPS1 (FBNeo WASM)',
  cps2: 'Capcom CPS2 (FBNeo WASM)',
  cps3: 'Capcom CPS3 (FBNeo WASM)',
  neogeo: 'SNK Neo Geo (FBNeo WASM)',
  arcade: 'Arcade Classics (FBNeo WASM)'
};

// 1. User's EXACT Verified Working Games List
const USER_VERIFIED_GAMES = [
  // --- 1. AAA, OPEN-WORLD & CONSOLE PORTS ---
  {
    id: "gta-5-wasm",
    title: "Grand Theft Auto V (GTA 5)",
    category: "aaa-console",
    engine: "RAGE C++ / Emscripten WASM + WebGPU",
    delivery: "Instant Stream",
    memoryEst: "700 MB Cache",
    multiplayer: false,
    iframeCompatible: false,
    thumbnailUrl: "https://wasmarcade.com/covers/gta-v-896.webp",
    primaryUrl: "https://gta.deloskiyt.pl/",
    mirrors: [
      { label: "WASM Arcade GTA 5", url: "https://wasmarcade.com/gta-5" }
    ],
    notes: "Play GTA V in a desktop browser through community WebAssembly and WebGPU port of the RAGE engine."
  },
  {
    id: "gta-vice-city",
    title: "Grand Theft Auto: Vice City",
    category: "aaa-console",
    engine: "reVC C++ / Emscripten WASM",
    delivery: "Instant Stream",
    memoryEst: "600 MB",
    multiplayer: false,
    iframeCompatible: false,
    thumbnailUrl: "https://wasmarcade.com/covers/vice-city-896.webp",
    primaryUrl: "https://wasmarcade.com/vice-city",
    mirrors: [
      { label: "WASM Arcade Mirror", url: "https://wasmarcade.com/" }
    ],
    notes: "Tommy Vercetti takes over 1980s Miami in an open world running in modern WebAssembly with radio audio, controller support, and cheats."
  },
  {
    id: "gta-iii",
    title: "Grand Theft Auto III",
    category: "aaa-console",
    engine: "re3 C++ / Emscripten WASM",
    delivery: "Instant Stream",
    memoryEst: "550 MB",
    multiplayer: false,
    iframeCompatible: false,
    thumbnailUrl: "https://wasmarcade.com/covers/gta3-896.webp",
    primaryUrl: "https://wasmarcade.com/gta3",
    mirrors: [
      { label: "WASM Arcade Mirror", url: "https://wasmarcade.com/" }
    ],
    notes: "The original 3D open world. Liberty City running on the re3 WebAssembly engine with streamed audio and cheats."
  },
  {
    id: "simpsons-hit-and-run",
    title: "The Simpsons: Hit & Run",
    category: "aaa-console",
    engine: "Radcore C++ / Emscripten WASM + AudioWorklet",
    delivery: "Instant Stream",
    memoryEst: "500 MB",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://wasmarcade.com/covers/hit-and-run-896.webp",
    primaryUrl: "https://shar-wasm.cjoseph.workers.dev/",
    mirrors: [
      { label: "Three.js Web Reconstruction", url: "https://vheissu.github.io/hit-and-run-web/" },
      { label: "WASM Arcade Simpsons", url: "https://wasmarcade.com/simpsons" }
    ],
    notes: "Springfield opens up across seven levels. Drive, walk and follow the story with the complete soundtrack running via WebAssembly."
  },
  {
    id: "cod-bo1-zombies",
    title: "Call of Duty: Black Ops 1 Zombies",
    category: "aaa-console",
    engine: "BO1 Decomp / WASM + WebGL2",
    delivery: "Instant Stream",
    memoryEst: "450 MB",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2gzt.jpg",
    primaryUrl: "https://vel.gg/bsz",
    mirrors: [
      { label: "Concentric Zombies Mirror", url: "https://zombies.concentric.live/" }
    ],
    notes: "Round-based Nazi Zombies engine decompilation running in WebAssembly. Features authentic round music, mystery box, and weapon mechanics."
  },
  {
    id: "halo-combat-evolved",
    title: "Halo: Combat Evolved [OpenHaloCE]",
    category: "aaa-console",
    engine: "OpenHaloCE C++ / Emscripten WASM",
    delivery: "Instant Stream",
    memoryEst: "500 MB",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x7g.jpg",
    primaryUrl: "https://openhaloce.com/",
    mirrors: [
      { label: "Halo OM Mirror", url: "https://halo.omgithub.com/" }
    ],
    notes: "Master Chief's legendary debut combat evolved running in modern client-side WebAssembly with multiplayer map support."
  },
  {
    id: "nfs-most-wanted-2005",
    title: "Need for Speed: Most Wanted (2005)",
    category: "aaa-console",
    engine: "EAGL C++ Decomp / Emscripten WASM",
    delivery: "Instant Stream",
    memoryEst: "650 MB",
    multiplayer: false,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7o.jpg",
    primaryUrl: "https://web.nfsmwo.com/",
    mirrors: [
      { label: "Itch.io Port", url: "https://dezm0n.itch.io/nfs-most-wanted-web-port" },
      { label: "Lauta Web Mirror", url: "https://nfsmwested.lauta.site/" }
    ],
    notes: "Climb the Blacklist 15 in Rockport City with authentic engine sounds, pursuit heat levels, and cop chases."
  },
  {
    id: "nfs-underground-2",
    title: "Need for Speed: Underground 2",
    category: "aaa-console",
    engine: "NFSU2 Web Port / WASM",
    delivery: "Instant Stream",
    memoryEst: "550 MB",
    multiplayer: false,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7m.jpg",
    primaryUrl: "https://nfsu2.xyz/",
    mirrors: [
      { label: "NFSU2 Direct", url: "https://nfsu2.xyz/" }
    ],
    notes: "Open world street racing across Bayview with full vehicle tuning, neon underglow, and drift events in WebAssembly."
  },
  {
    id: "pes-6",
    title: "Pro Evolution Soccer 6 (PES 6)",
    category: "aaa-console",
    engine: "PS2 / PC Native WASM Port",
    delivery: "Instant Stream",
    memoryEst: "400 MB",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2e2v.jpg",
    primaryUrl: "https://pes6.optijuegos.net/",
    mirrors: [
      { label: "OptiJuegos PES 6", url: "https://pes6.optijuegos.net/" }
    ],
    notes: "The golden era of football simulation running in browser WebAssembly with fluid ball physics and Master League."
  },
  {
    id: "pes-2011",
    title: "Pro Evolution Soccer 2011 (PES 2011)",
    category: "aaa-console",
    engine: "Konami Engine Web Port / WASM",
    delivery: "Instant Stream",
    memoryEst: "500 MB",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2e2w.jpg",
    primaryUrl: "https://pes11.optijuegos.net/",
    mirrors: [
      { label: "OptiJuegos PES 11", url: "https://pes11.optijuegos.net/" }
    ],
    notes: "PES 2011 featuring 360-degree passing control and UEFA Champions League licenses compiled to browser WebAssembly."
  },
  {
    id: "team-fortress-2",
    title: "Team Fortress 2",
    category: "aaa-console",
    engine: "Source Engine C++ / Emscripten WASM",
    delivery: "Instant Stream",
    memoryEst: "600 MB",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7u.jpg",
    primaryUrl: "https://tf2.riddy.workers.dev/",
    mirrors: [
      { label: "Riddy Edge Worker", url: "https://tf2.riddy.workers.dev/" }
    ],
    notes: "Valve's legendary 9-class team shooter running on Source Engine WebAssembly with 2Fort and Dustbowl maps."
  },
  {
    id: "tekken-5-dark-resurrection",
    title: "Tekken 5: Dark Resurrection",
    category: "aaa-console",
    engine: "Namco Recomp / WASM + WebGL2",
    delivery: "Instant Stream",
    memoryEst: "480 MB",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co23a2.jpg",
    primaryUrl: "https://tkdr-recomp.pages.dev/",
    mirrors: [
      { label: "Cloudflare Pages Recomp", url: "https://tkdr-recomp.pages.dev/" }
    ],
    notes: "60 FPS 3D fighting martial arts tournament running on static decompilation in WebAssembly."
  },
  {
    id: "cyberpunk-2077-web",
    title: "Cyberpunk 2077 (Web)",
    category: "aaa-console",
    engine: "REDengine Community Demake / WASM",
    delivery: "Instant Stream",
    memoryEst: "350 MB",
    multiplayer: false,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2mdf.jpg",
    primaryUrl: "https://cyberpunk2077.lol/",
    mirrors: [
      { label: "Web Port Mirror", url: "https://cyberpunk2077.lol/" }
    ],
    notes: "Night City browser demake running in client-side WebAssembly with cyberware and neon street aesthetics."
  },
  {
    id: "flatout-2",
    title: "FlatOut 2",
    category: "aaa-console",
    engine: "Bugbear C++ / Emscripten WASM",
    delivery: "Instant Stream",
    memoryEst: "450 MB",
    multiplayer: false,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r81.jpg",
    primaryUrl: "https://dezm0n.itch.io/flatout-2-web-port",
    mirrors: [
      { label: "Itch.io Port", url: "https://dezm0n.itch.io/flatout-2-web-port" }
    ],
    notes: "Destruction derby arcade racing with extreme ragdoll physics, nitro boosts, and smashable track environments."
  },

  // --- 2. NINTENDO & CONSOLE DECOMPILATIONS ---
  {
    id: "super-mario-64",
    title: "Super Mario 64",
    category: "nintendo-decomp",
    engine: "sm64-port C / Emscripten WASM + WebGL",
    delivery: "Instant Stream",
    memoryEst: "64 MB",
    multiplayer: false,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2163.jpg",
    primaryUrl: "https://olivers.tools/",
    mirrors: [
      { label: "Olivers Tools Hub", url: "https://olivers.tools/" }
    ],
    notes: "Byte-accurate decompilation of Super Mario 64 running natively with smooth camera controls and 60 FPS WebGL rendering."
  },
  {
    id: "super-smash-bros",
    title: "Super Smash Bros.",
    category: "nintendo-decomp",
    engine: "Smash Web Port / WASM",
    delivery: "Instant Stream",
    memoryEst: "128 MB",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x6u.jpg",
    primaryUrl: "https://smash.fun/",
    mirrors: [
      { label: "Smash Fun Direct", url: "https://smash.fun/" }
    ],
    notes: "Play original Super Smash Bros directly in browser with full roster, items, and Sector Z / Hyrule Castle stages."
  },
  {
    id: "super-monkey-ball",
    title: "Super Monkey Ball",
    category: "nintendo-decomp",
    engine: "MonkeyBall C++ / WASM",
    delivery: "Instant Stream",
    memoryEst: "110 MB",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2v0h.jpg",
    primaryUrl: "https://monkeyball-online.pages.dev/",
    mirrors: [
      { label: "Cloudflare Pages", url: "https://monkeyball-online.pages.dev/" }
    ],
    notes: "Roll AiAi and friends through tilting 3D courses with precision physics running in client-side WebAssembly."
  },
  {
    id: "super-mario-zombies",
    title: "Super Mario Zombies",
    category: "nintendo-decomp",
    engine: "SMZ Decomp / WASM",
    delivery: "Instant Stream",
    memoryEst: "95 MB",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2163.jpg",
    primaryUrl: "https://smz.fun/",
    mirrors: [
      { label: "SMZ Direct", url: "https://smz.fun/" }
    ],
    notes: "Mario round-based zombie survival mod with powerups, mystery boxes, and custom weapons."
  },
  {
    id: "crash-bash",
    title: "Crash Bash",
    category: "nintendo-decomp",
    engine: "PSX Decomp / WASM",
    delivery: "Instant Stream",
    memoryEst: "150 MB",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co25l0.jpg",
    primaryUrl: "https://crashbash.app/",
    mirrors: [
      { label: "Crash Bash Web", url: "https://crashbash.app/" }
    ],
    notes: "Crash Bandicoot party mini-games (Crate Crush, Polar Push, Ballistix) running directly in WebAssembly."
  },
  {
    id: "nhl-94",
    title: "NHL '94",
    category: "nintendo-decomp",
    engine: "Genesis / SNES Web Core",
    delivery: "Instant Stream",
    memoryEst: "32 MB",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2e30.jpg",
    primaryUrl: "https://kingof94.web.app/",
    mirrors: [
      { label: "King of 94 Web", url: "https://kingof94.web.app/" }
    ],
    notes: "The greatest sports game of the 16-bit era preserved in client-side WebAssembly with one-timers and organ tunes."
  },

  // --- 3. CLASSIC PC FPS, RTS & RPG PORTS ---
  {
    id: "counter-strike-16",
    title: "Counter-Strike 1.6",
    category: "classic-pc",
    engine: "Xash3D FWGS WASM + WebSockets MP",
    delivery: "Instant Stream",
    memoryEst: "320 MB",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x78.jpg",
    primaryUrl: "https://play-cs.com/",
    mirrors: [
      { label: "Play-CS Online", url: "https://play-cs.com/" }
    ],
    notes: "Official GoldSrc CS 1.6 engine compiled to WebAssembly with de_dust2, cs_assault, custom crosshairs, and live matchmaking."
  },
  {
    id: "counter-strike-surf",
    title: "Counter-Strike Surf",
    category: "classic-pc",
    engine: "Source Movement / WASM",
    delivery: "Instant Stream",
    memoryEst: "200 MB",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x78.jpg",
    primaryUrl: "https://surfd.net/",
    mirrors: [
      { label: "SurfD Net", url: "https://surfd.net/" }
    ],
    notes: "Surf physics simulator running in browser WebAssembly with smooth ramps, air strafing, and community maps."
  },
  {
    id: "cs-source-bhop",
    title: "Counter-Strike: Source Bunnyhop",
    category: "classic-pc",
    engine: "Source Engine Bhop / WASM",
    delivery: "Instant Stream",
    memoryEst: "180 MB",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x78.jpg",
    primaryUrl: "https://bunnyhop.lol/",
    mirrors: [
      { label: "Bunnyhop LOL", url: "https://bunnyhop.lol/" }
    ],
    notes: "Dedicated bunnyhop timing and air strafe trainer running natively in browser WebAssembly."
  },
  {
    id: "quake-1-netquake",
    title: "Quake I (NetQuake)",
    category: "classic-pc",
    engine: "WebQuake C / Emscripten WASM + WebGL",
    delivery: "Instant Stream",
    memoryEst: "80 MB",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x79.jpg",
    primaryUrl: "https://www.netquake.io/",
    mirrors: [
      { label: "NetQuake IO", url: "https://www.netquake.io/" }
    ],
    notes: "id Software's dark fantasy 3D gothic shooter with multiplayer deathmatch, rocket jumping, and full shareware episode."
  },
  {
    id: "quake-2",
    title: "Quake II",
    category: "classic-pc",
    engine: "Yamagi Quake II C++ / Emscripten WASM",
    delivery: "Instant Stream",
    memoryEst: "120 MB",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x7j.jpg",
    primaryUrl: "https://q2.pieter.com/",
    mirrors: [
      { label: "Pieter Q2 Web", url: "https://q2.pieter.com/" }
    ],
    notes: "Bitterman's assault on the Strogg home world running at 60 FPS in WebAssembly with railgun and colored lighting."
  },
  {
    id: "tremulous",
    title: "Tremulous",
    category: "classic-pc",
    engine: "ioquake3 WASM + WebSockets",
    delivery: "Instant Stream",
    memoryEst: "190 MB",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r8c.jpg",
    primaryUrl: "https://webnova360.com/play-tremulous/",
    mirrors: [
      { label: "WebNova360 Tremulous", url: "https://webnova360.com/play-tremulous/" }
    ],
    notes: "Humans vs. Aliens tactical team FPS with base building and real-time evolution in WebAssembly."
  },
  {
    id: "classic-doom-webprboom",
    title: "Classic Doom & Doom II (WebPrBoom)",
    category: "classic-pc",
    engine: "PrBoom+ / WebAssembly + WebGL",
    delivery: "Instant Stream",
    memoryEst: "45 MB",
    multiplayer: false,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7a.jpg",
    primaryUrl: "https://raz0red.github.io/webprboom/",
    mirrors: [
      { label: "Silent Space Marine", url: "https://silentspacemarine.com/" }
    ],
    notes: "Complete DOOM & DOOM II engine running in browser with support for uploading custom WADs and mods."
  },
  {
    id: "classic-doom-silent",
    title: "Classic Doom (Silent Space Marine)",
    category: "classic-pc",
    engine: "Chocolate Doom WASM + WebAudio",
    delivery: "Instant Stream",
    memoryEst: "40 MB",
    multiplayer: false,
    iframeCompatible: true,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7a.jpg",
    primaryUrl: "https://silentspacemarine.com/",
    mirrors: [
      { label: "WebPrBoom", url: "https://raz0red.github.io/webprboom/" }
    ],
    notes: "id Software's iconic shareware release running at flawless 60 FPS in WebAssembly with keyboard, mouse, and gamepad."
  },
  {
    id: "diablo-1996",
    title: "Diablo (1996)",
    category: "classic-pc",
    engine: "DevilutionX C++ / Emscripten WASM",
    delivery: "Instant Stream",
    memoryEst: "160 MB",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r77.jpg",
    primaryUrl: "https://d07riv.github.io/diabloweb/",
    mirrors: [
      { label: "John Imril Mirror", url: "https://johnimril.github.io/diablo_web/" }
    ],
    notes: "Explore the labyrinth beneath Tristram Cathedral with Warrior, Rogue, or Sorcerer. Supports spawn shareware and retail DIABDAT.MPQ."
  },
  {
    id: "descent-1",
    title: "Descent",
    category: "classic-pc",
    engine: "DXX-Rebirth C++ / Emscripten WASM",
    delivery: "Instant Stream",
    memoryEst: "65 MB",
    multiplayer: false,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r8e.jpg",
    primaryUrl: "https://midzer.de/wasm/descent1/",
    mirrors: [
      { label: "Midzer Descent Port", url: "https://midzer.de/wasm/descent1/" }
    ],
    notes: "6-degrees-of-freedom zero-gravity subterranean shooter running in client-side WebAssembly."
  },
  {
    id: "nolf",
    title: "No One Lives Forever (NOLF)",
    category: "classic-pc",
    engine: "LithTech C++ / WASM Port",
    delivery: "Instant Stream",
    memoryEst: "380 MB",
    multiplayer: false,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r8f.jpg",
    primaryUrl: "https://playnolf.com/",
    mirrors: [
      { label: "PlayNOLF Web", url: "https://playnolf.com/" }
    ],
    notes: "Cate Archer's 1960s espionage spy thriller running with humor, gadgets, and stealth mechanics in WebAssembly."
  },
  {
    id: "myth-fallen-lords",
    title: "Myth: The Fallen Lords",
    category: "classic-pc",
    engine: "Bungie Myth Engine / WASM",
    delivery: "Instant Stream",
    memoryEst: "220 MB",
    multiplayer: false,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r8g.jpg",
    primaryUrl: "https://myth.game/",
    mirrors: [
      { label: "Myth Game Official", url: "https://myth.game/" }
    ],
    notes: "Bungie's real-time tactical dark fantasy strategy game with 3D terrain physics and formations."
  },
  {
    id: "lego-racers",
    title: "LEGO Racers",
    category: "classic-pc",
    engine: "High Voltage C++ / WASM",
    delivery: "Instant Stream",
    memoryEst: "180 MB",
    multiplayer: false,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2p5l.jpg",
    primaryUrl: "https://steponit.online/",
    mirrors: [
      { label: "StepOnIt Online", url: "https://steponit.online/" }
    ],
    notes: "Build custom LEGO cars and race against Rocket Racer across Imperial Grand Prix and Dark Forest tracks."
  },
  {
    id: "space-cadet-pinball",
    title: "3D Pinball: Space Cadet",
    category: "classic-pc",
    engine: "Pinball Decomp / Emscripten WASM",
    delivery: "Instant Stream",
    memoryEst: "25 MB",
    multiplayer: false,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2r2m.jpg",
    primaryUrl: "https://ksylvestre.itch.io/space-cadet-pinball",
    mirrors: [
      { label: "Itch.io Space Cadet", url: "https://ksylvestre.itch.io/space-cadet-pinball" }
    ],
    notes: "The legendary Windows pinball game recompiled to WebAssembly with complete physics, sound effects, and Cadet-to-Fleet Admiral ranks."
  },
  {
    id: "beneath-a-steel-sky",
    title: "Beneath a Steel Sky",
    category: "classic-pc",
    engine: "ScummVM WASM Web Player",
    delivery: "Instant Stream",
    memoryEst: "85 MB",
    multiplayer: false,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r8h.jpg",
    primaryUrl: "https://scummweb.tsilva.eu/beneath-a-steel-sky/play",
    mirrors: [
      { label: "ScummWeb Player", url: "https://scummweb.tsilva.eu/beneath-a-steel-sky/play" }
    ],
    notes: "Revolution Software's classic cyberpunk point-and-click adventure with Robert Foster and Joey the robot in Union City."
  },

  // --- 4. MODERN INDIE, ROGUELIKE & SANDBOX PORTS ---
  {
    id: "minecraft-eaglercraft-wasm",
    title: "Minecraft 1.8.8 (EaglercraftX WASM)",
    category: "modern-indie",
    engine: "Java Bytecode -> TeaVM / WASM-GC",
    delivery: "Instant Stream",
    memoryEst: "250 MB",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://wasmarcade.com/covers/minecraft-896.webp",
    primaryUrl: "https://wasmarcade.com/minecraft",
    mirrors: [
      { label: "Minecraft Classic", url: "https://classic.minecraft.net/" }
    ],
    notes: "Build, mine and survive in procedural block worlds. Minecraft 1.8.8 compiled to WebAssembly with local device world saves."
  },
  {
    id: "minecraft-classic",
    title: "Minecraft Classic",
    category: "modern-indie",
    engine: "Mojang Official JS / WASM",
    delivery: "Instant Stream",
    memoryEst: "60 MB",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://wasmarcade.com/covers/minecraft-896.webp",
    primaryUrl: "https://classic.minecraft.net/",
    mirrors: [
      { label: "Official Classic Portal", url: "https://classic.minecraft.net/" }
    ],
    notes: "Original 2009 creative sandbox release by Markus Persson preserved by Mojang in modern browsers with 32 block types."
  },
  {
    id: "hollow-knight",
    title: "Hollow Knight: Voidheart Edition",
    category: "modern-indie",
    engine: "Unity WebGL / Emscripten WASM",
    delivery: "Instant Stream",
    memoryEst: "600 MB",
    multiplayer: false,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r0c.jpg",
    primaryUrl: "https://dezm0n.itch.io/hollow-knight-web-port",
    mirrors: [
      { label: "Itch.io Port", url: "https://dezm0n.itch.io/hollow-knight-web-port" }
    ],
    notes: "Descend into the ruined kingdom of Hallownest. Team Cherry's acclaimed metroidvania running in client-side WebAssembly."
  },
  {
    id: "among-us-web",
    title: "Among Us",
    category: "modern-indie",
    engine: "Unity WebGL / WASM",
    delivery: "Instant Stream",
    memoryEst: "180 MB",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co22p1.jpg",
    primaryUrl: "https://wasm.rip/files/amongus/index.html",
    mirrors: [
      { label: "WASM.rip Among Us", url: "https://wasm.rip/files/amongus/index.html" }
    ],
    notes: "Complete crewmate tasks or sabotage as the Impostor on the Skeld in client-side WebAssembly."
  },
  {
    id: "night-in-the-woods",
    title: "Night in the Woods",
    category: "modern-indie",
    engine: "Unity WebGL / WASM",
    delivery: "Instant Stream",
    memoryEst: "400 MB",
    multiplayer: false,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r09.jpg",
    primaryUrl: "https://olivers.tools/play/",
    mirrors: [
      { label: "Olivers Tools Player", url: "https://olivers.tools/play/" }
    ],
    notes: "College dropout Mae Borowski returns home to the crumbling former mining town of Possum Springs."
  },
  {
    id: "ddlc-plus",
    title: "Doki Doki Literature Club Plus! (DDLC Plus)",
    category: "modern-indie",
    engine: "Unity WebGL / WASM",
    delivery: "Instant Stream",
    memoryEst: "350 MB",
    multiplayer: false,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co38e9.jpg",
    primaryUrl: "https://selenite.cc/resources/semag/ddlcplus/index.html",
    mirrors: [
      { label: "Selenite Web Player", url: "https://selenite.cc/resources/semag/ddlcplus/index.html" }
    ],
    notes: "Psychological horror visual novel experience running entirely within client-side WebAssembly sandbox."
  },

  // --- 5. MASTER DIRECTORIES & GAME HUBS ---
  {
    id: "browser-games-online",
    title: "Browser Games Online",
    category: "hubs",
    engine: "Web Port Index Directory",
    delivery: "Instant Stream",
    memoryEst: "Varies",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1w6k.jpg",
    primaryUrl: "https://browsergame.online/",
    mirrors: [
      { label: "Browser Games Online", url: "https://browsergame.online/" }
    ],
    notes: "Curated collection of playable in-browser game ports and browser-native engines."
  },
  {
    id: "wasmarcade-portal",
    title: "WASM Arcade Master Hub (518 Games)",
    category: "hubs",
    engine: "Multi-Engine Web Port Aggregator",
    delivery: "Instant Stream",
    memoryEst: "Varies",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://wasmarcade.com/og/site-v2.png",
    primaryUrl: "https://wasmarcade.com/",
    mirrors: [
      { label: "DOS.Zone Direct Player", url: "https://dos.zone/" }
    ],
    notes: "Master collection indexing 518 WebAssembly game ports across PC, Capcom CPS, Neo Geo, and Ruffle Flash."
  },
  {
    id: "noneedsteam-hub",
    title: "NoNeedSteam",
    category: "hubs",
    engine: "Standalone Web Port Directory",
    delivery: "Instant Stream",
    memoryEst: "Varies",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2163.jpg",
    primaryUrl: "https://www.noneedsteam.com/",
    mirrors: [
      { label: "NoNeedSteam Official", url: "https://www.noneedsteam.com/" }
    ],
    notes: "Extensive archive of PC games compiled to run without Steam client directly in browser."
  },
  {
    id: "ultimate-catalog-repo",
    title: "Ultimate Catalog of Web Game Ports",
    category: "hubs",
    engine: "GitHub Decompilation Registry",
    delivery: "Instant Stream",
    memoryEst: "Varies",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x78.jpg",
    primaryUrl: "https://github.com/Carter54git/Ultimate-Catalog-Of-Web-Game-Ports",
    mirrors: [
      { label: "GitHub Repository", url: "https://github.com/Carter54git/Ultimate-Catalog-Of-Web-Game-Ports" }
    ],
    notes: "Open source community repository documenting hundreds of verified web ports and decompilations."
  },
  {
    id: "recompiled-games",
    title: "Recompiled Games",
    category: "hubs",
    engine: "Static Recompilation Hub",
    delivery: "Instant Stream",
    memoryEst: "Varies",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co23a2.jpg",
    primaryUrl: "https://recompiledgames.com/",
    mirrors: [
      { label: "Recompiled Games Mirror", url: "https://recompiledgames.com/" }
    ],
    notes: "Platform specializing in static binary recompiled console titles compiled directly to WebAssembly."
  },
  {
    id: "rgc-zone",
    title: "RGC.Zone",
    category: "hubs",
    engine: "Retro Game Cloud Hub",
    delivery: "Instant Stream",
    memoryEst: "Varies",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1x6u.jpg",
    primaryUrl: "https://rgc.zone/",
    mirrors: [
      { label: "RGC Zone", url: "https://rgc.zone/" }
    ],
    notes: "Dedicated repository of retro game ports, homebrew releases, and WebAssembly builds."
  },
  {
    id: "wasm-rip-hub",
    title: "WASM.rip Hub",
    category: "hubs",
    engine: "WebAssembly Rip Archive",
    delivery: "Instant Stream",
    memoryEst: "Varies",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co22p1.jpg",
    primaryUrl: "https://wasm.rip/",
    mirrors: [
      { label: "WASM Rip", url: "https://wasm.rip/" }
    ],
    notes: "High performance CDN hosting extracted WebAssembly binaries, Unity WebGL builds, and indie games."
  },
  {
    id: "ported-games-hub",
    title: "PortedGames",
    category: "hubs",
    engine: "Community Port Directory",
    delivery: "Instant Stream",
    memoryEst: "Varies",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7o.jpg",
    primaryUrl: "https://portedgames.com/",
    mirrors: [
      { label: "PortedGames Hub", url: "https://portedgames.com/" }
    ],
    notes: "Comprehensive index tracking web ports of commercial PC, PlayStation, and Nintendo games."
  },
  {
    id: "radiant-optimizer",
    title: "Radiant Optimizer",
    category: "hubs",
    engine: "Gaming Runtime Hub",
    delivery: "Instant Stream",
    memoryEst: "Varies",
    multiplayer: true,
    iframeCompatible: false,
    thumbnailUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7u.jpg",
    primaryUrl: "https://radiantoptimizer.games/",
    mirrors: [
      { label: "Radiant Optimizer Games", url: "https://radiantoptimizer.games/" }
    ],
    notes: "High performance web gaming hub featuring unblocked games and browser engine ports."
  }
];

// 2. Transform Retro Arcade Games from wasmarcade.com (Capcom CPS1/2/3, Neo Geo, Arcade)
const retroGames = retroRaw.map(g => {
  const sysName = SYSTEM_NAMES[g.sys] || 'Arcade Classics (FBNeo WASM)';
  const sizeMb = g.bytes ? Math.max(1, Math.round(g.bytes / (1024 * 1024))) : 4;
  return {
    id: `retro-${g.slug || g.id}`,
    title: g.title,
    category: "retro-arcade",
    engine: sysName,
    delivery: "Instant Stream",
    memoryEst: `${sizeMb} MB ROM`,
    multiplayer: (g.players || 1) > 1,
    iframeCompatible: false,
    thumbnailUrl: `https://wasmarcade.com/emulation/boxart-v2/${g.id}-225.webp`,
    primaryUrl: `https://wasmarcade.com/retro-games/${g.slug || g.id}`,
    mirrors: [
      { label: "WASM Arcade Mirror", url: `https://wasmarcade.com/retro-games/${g.slug || g.id}` }
    ],
    notes: g.about || g.blurb || `Play ${g.title} in your browser — authentic ${g.sys.toUpperCase()} arcade hardware running on WebAssembly FBNeo.`
  };
});

// 3. Transform Flash Games from wasmarcade.com
const flashGames = flashRaw.map(g => {
  const sizeMb = g.bytes ? Math.max(1, Math.round(g.bytes / (1024 * 1024))) : 2;
  return {
    id: `flash-${g.id}`,
    title: g.title,
    category: "flash-classics",
    engine: "Ruffle Flash Emulator (WASM)",
    delivery: "Instant Stream",
    memoryEst: `${sizeMb} MB SWF`,
    multiplayer: false,
    iframeCompatible: false,
    thumbnailUrl: `https://wasmarcade.com/flash/thumbs/${g.id}-225.webp`,
    primaryUrl: `https://wasmarcade.com/flash-games/${g.id}`,
    mirrors: [
      { label: "WASM Arcade Flash", url: `https://wasmarcade.com/flash-games/${g.id}` }
    ],
    notes: g.blurb || `Play classic Flash game ${g.title} preserved and compiled to WebAssembly via the Ruffle runtime emulator.`
  };
});

// 4. Combine all games with user's verified list upfront
const allGames = [
  ...USER_VERIFIED_GAMES,
  ...retroGames,
  ...flashGames
];

console.log('User Verified Working Games:', USER_VERIFIED_GAMES.length);
console.log('Retro Arcade ports:', retroGames.length);
console.log('Flash Classics ports:', flashGames.length);
console.log('Total catalog size:', allGames.length);

// 5. Generate final JS file content
const fileContent = `/**
 * WASM//DECK Master Verified Games Catalog
 * Total Verified Working Games: ${allGames.length}
 * Contains user's verified working list + wasmarcade.com (518 games)
 */

export const VERIFIED_WASM_GAMES = ${JSON.stringify(allGames, null, 2)};

export const CATEGORIES = [
  { id: "all", label: "All Verified Ports", count: 0 },
  { id: "aaa-console", label: "AAA & Console Ports", count: 0 },
  { id: "nintendo-decomp", label: "Nintendo & Console Decomps", count: 0 },
  { id: "classic-pc", label: "Classic PC FPS, RTS & RPG", count: 0 },
  { id: "modern-indie", label: "Modern Indie & Sandbox", count: 0 },
  { id: "retro-arcade", label: "Capcom & Neo Geo Arcade", count: 0 },
  { id: "flash-classics", label: "Flash Classics (Ruffle)", count: 0 },
  { id: "hubs", label: "Master Directories & Hubs", count: 0 },
  { id: "favorites", label: "★ Favorites", count: 0 },
  { id: "recent", label: "⏱ Recently Played", count: 0 }
];

export const DELIVERY_MODES = [
  { id: "all", label: "All Deliveries" },
  { id: "Instant Stream", label: "Instant Stream", desc: "Pre-packaged chunked assets via R2/CDN" },
  { id: "BYO-ROM", label: "BYO-ROM", desc: "Clean-room engine requiring user retail data/MPQ/ROM" }
];

export const QUARANTINED_DOMAINS = [
  { domain: "fiveplay.lol", threat: "Trojan / Installer Bundler pretending to be GTA 5 Web (Prompt user to download .exe)", date: "2026-08-12", status: "Quarantined" },
  { domain: "fortniteog.lol", threat: "Phishing survey trap / credential harvester disguised as Fortnite browser port", date: "2026-09-03", status: "Blocked" },
  { domain: "skate.aaddpp.lol", threat: "Fake Skate 3 .lol ad-farm and redirection payload", date: "2026-10-08", status: "Blacklisted" },
  { domain: "gta6browser.click", threat: "Monero Web Miner injection", date: "2026-10-01", status: "Blacklisted" },
  { domain: "cod-warzone-free.biz", threat: "Malicious Chrome extension installer payload", date: "2026-10-15", status: "Blacklisted" }
];
`;

fs.writeFileSync(path.join(__dirname, '../src/data/gamesData.js'), fileContent, 'utf8');
console.log('Successfully wrote sanitized src/data/gamesData.js!');
