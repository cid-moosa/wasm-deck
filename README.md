# WASM//DECK

> Zero-Cloud Native WebAssembly Game Engine Runtime & Spatial 3D Portal

[![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub_Pages-22c55e?logo=github)](https://cid-moosa.github.io/wasm-deck/)
[![WebAssembly](https://img.shields.io/badge/WebAssembly-WASM-654FF0?logo=webassembly)](https://webassembly.org/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL_3D-000000?logo=threedotjs)](https://threejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

WASM//DECK is a high-craft, client-side WebAssembly game launcher that allows users to browse, inspect, and run over 560 verified native game ports, homebrew engines, and decompilations directly inside modern browser sandboxes without cloud game streaming, emulators, or external plugins.

---

## ✨ Features

- **560+ Verified Native Ports**: AAA/Console ports (GTA V, GTA Vice City, GTA III, The Simpsons Hit & Run), 220+ Capcom & Neo Geo retro arcade classics via FBNeo WASM, and 280+ Flash games via Ruffle WASM.
- **Authentic Artwork**: Canonical Steam landscape headers (`apps/<id>/header.jpg`) and authentic boxarts with zero generic placeholders.
- **Minimalist Spatial 3D Deck**: Real-time Three.js WebGL studio cartridge showcase with PBR materials, smooth mouse gyro-tilt physics, and live game texture mapping.
- **Pure Client-Side Execution**: Runs 100% locally in browser memory using WebGPU, WebGL2, OffscreenCanvas, and AudioWorklet.
- **Telemetry & Isolation**: Real-time hardware telemetry (Host RAM, WebGPU status, OPFS persistent cache estimate, and Gamepad API integration).
- **Console Theater**: Built-in 16:9 / 4:3 embedded viewport with pointer-lock support and standalone tab launch modes.

---

## 🚀 Quickstart

Clone the repository and run the local development server:

```bash
git clone https://github.com/cid-moosa/wasm-deck.git
cd wasm-deck
npm install
npm run dev
```

The application will be live at `http://localhost:5173/`.

To build the production bundle:

```bash
npm run build
```

---

## 🛠️ Tech Stack

- **Framework**: React 19 / Vite 6
- **Styling**: Tailwind CSS v4 + Custom Awwwards-standard Minimalist Design System
- **3D Engine**: Three.js (WebGL PBR & Spatial Materials)
- **Audio**: Web Audio API Procedural Synthesizer
- **Icons**: Lucide React
- **Deployment**: GitHub Pages via GitHub Actions CI/CD

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

Crafted by [@cid-moosa](https://github.com/cid-moosa).
