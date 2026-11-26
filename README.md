# WASM//DECK

> **Zero Cloud Streaming • Pure WebAssembly • High-Craft Neo-Arcade Portal**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)](https://github.com/cid-moosa/wasm-deck)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.3-646CFF.svg)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)

WASM//DECK is a client-side WebAssembly game engine runtime archive and launcher. It enables browsing, searching, filtering, bookmarking, and directly playing **563 verified browser-playable games, WebAssembly ports, retro emulations, and homebrew engines** inside a responsive kinetic interface with zero required plugins, cloud streaming, or server infrastructure.

---

## ⚡ Key Features

- **563 Verified WebAssembly Ports**: Native browser ports spanning AAA console decompilations (GTA III / VC / SA, Mario 64, Diablo, Pinball), retro emulations, Flash classics (via Ruffle WASM), indie hits, and port hubs.
- **Floating Cyber HUD Dock**: Sleek frosted-glass dock (`.hud-dock`) with dual-border glow, real-time hardware display refresh telemetry (`FPS` ticker), deduplicated brand lockup, search palette shortcut (`⌘ K`), and theme customizer.
- **Procedural 2D ASCII Background Engines**: 5 selectable standalone background simulations:
  - 🐟 **ASCII Koi Pond**: Organic pond simulation with caustics, wake stamps, and an interactive **Secret Feeding Easter Egg** (click background or press `F` anywhere!).
  - 🟢 **Cyber Matrix Rain**: Cascading green phosphor and katakana streams with glowing heads and glyph morphs.
  - 🌊 **Synthwave 3D Perspective Grid**: Mathematical rolling wireframe terrain with starry horizon.
  - 🚀 **Hyperspace Warp**: 3D warp-drive velocity starfield with mouse parallax.
  - 🧬 **Conway's Game of Life**: Living cellular automata grid with aging trails and glider injection.
- **Single-Window In-Deck Sandbox**: All 563 games render continuously in one fluid window without pagination gates, opening directly inside an embedded sandboxed `<iframe>` with instant fullscreen support.
- **Physical Liquid Glass Architecture**: Analytical signed-distance-field (SDF) optical refraction geometry with Snell's law refraction and chromatic dispersion.
- **Local-First Persistence**: Theme presets, custom accent palettes, frame-rate modes, favorite games, and recent play histories persist locally in `localStorage`.

---

## 🚀 Quickstart

### Prerequisites
- Node.js $\ge 20$
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/cid-moosa/wasm-deck.git
cd wasm-deck

# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev
```

Open `http://localhost:5173/` in your browser.

---

## 🛠️ Verification & Build Commands

```bash
# Type check TypeScript without emit
npm run check

# Run Vitest unit & integration test suites
npm test

# Build production bundle to dist/public/
npm run build

# Preview production build locally
npm run preview
```

---

## 📁 Architecture & Tech Stack

- **Frontend**: React 19, TypeScript 5.9, Vite 7, Tailwind CSS v4, Framer Motion 12, Wouter 3, Lucide React, Radix UI primitives.
- **Canvas Engines**: Hardware-accelerated 2D Canvas procedural character simulations running at up to 120 FPS.
- **Data Layer**: High-density JSON catalog containing 563 validated games with runtime metadata, memory estimates, engine badges, and mirrors.
- **Packaging & Tests**: Vitest with comprehensive suites covering liquid glass shaders, ASCII rendering engines, and platform bindings.

---

## 🐟 Secret Easter Eggs

- **Koi Feeding**: When using the ASCII Koi Pond background, press `F` anywhere on your keyboard or click an open area of the pond to drop food pellets. Nearby fish will accelerate, rise to the surface, and eat them with water ripples and bubbles! You can also click the `563 PORTS` status badge in the top dock.

---

## 📄 License & Attribution

Distributed under the MIT License. Crafted by [cid-moosa](https://github.com/cid-moosa).
