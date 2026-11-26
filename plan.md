# WASM//DECK — motion-forward redesign plan

## Product and implementation

Continue the existing WASM//DECK project as a static React/TypeScript/Vite website. Keep the original product purpose and the 563-record upstream catalog in `client/public/catalog.json`; load it separately from the UI. Preserve every record's listed title, category, engine/runtime, size estimate, source flags, thumbnail, and existing primary URL. Records are catalog listings, not live-verified playable games. Only the catalog's own flag identifies an entry as in-deck compatible. Keep external launch links opening the actual listed source in a new tab.

Retain the complete discovery experience: category/popular/all/favorites/recent collections; keyboard-accessible search and shortcut; in-deck and multiplayer filters; sorting; grid/list views; random pick from the active eligible set; pagination; loading/error/empty/no-results states; locally stored favorites and recent entries; proposal form link; about/specifications dialog; accessible in-deck dialog. Keep these functions immediate, and do not make them wait for animations.

Recast the page as a visibly kinetic game-launch deck rather than another restrained static directory. Add a cinematic yet compact hero with an animated arcade stage, staged headline/action entrance, floating source-art tiles, and a fine scroll-progress trace. Use Motion/Framer Motion already present in the project for short sequences, card interaction and layout transitions; use CSS for light ambient artwork and visual details. Do not install a second animation engine or add a full-page WebGL/particle runtime. Keep effects focused on the hero and user interaction, not running continuously over every catalog card.

For the catalog, reveal only a bounded first visible group, then animate entry of items when they become visible; cap stagger delay so long lists do not produce a slow parade. Give cards distinct pointer hover, keyboard-focus, and pressed feedback. Use `AnimatePresence` and layout transitions for cards that enter/leave after filtering and for the existing in-deck dialog, preserving its current modal launch semantics. Keep game names, source metadata, and buttons readable/stable throughout transitions. Avoid animating all 563 records or doing per-record animation calculations on every keystroke.

Use Motion's reduced-motion setting and existing CSS `prefers-reduced-motion` rules: remove long staggers, parallax, large scale/position shifts, and ambient loops; use immediate state changes or brief opacity feedback, with all text, controls, and feedback still present. Mobile/touch must retain the normal browse and launch path without hover-only behavior. Prefer transforms/opacity; no autoplaying audio/video and no motion that competes with titles, controls, or accessibility.

The source/reference findings are recorded in [`MOTION-REFERENCES.md`](MOTION-REFERENCES.md). They distinguish animation tools from site references and record access/evidence limitations; use this as inspiration, not a mandate to install or copy every tool.

### Project structure

- `client/src/pages/Home.tsx`: catalog fetch, filters, local state, accessible interaction and hero/page composition.
- `client/public/catalog.json`: separate refreshable 563-record source dataset and real destinations.
- `client/src/data/catalog.ts`: record types, category labels, safe URL handling, and local-storage helpers.
- `client/src/components/GameCard.tsx`: metadata and source links plus bounded reveal, hover/focus/press, layout, and favorite feedback.
- `client/src/components/HeroDeck.tsx`: visual hero stage, mouse/touch-safe perspective accent, source-art tiles, and staged introduction.
- `client/src/components/ScrollProgress.tsx`: lightweight page-scroll progress line.
- `client/src/components/Dialog.tsx`: accessible native modal for about/submission/in-deck content; animate the existing player transition without changing launch semantics.
- `client/src/components/BrandMark.tsx`: custom stepped W/signal logo with a small, reduced-motion-safe entrance accent.
- `client/src/App.tsx`: wrap the single-page route in the Motion provider/reduced-motion configuration.
- `client/src/index.css`: design tokens, responsive layout, motion surfaces/keyframes, focus styling, and reduced-motion fallback.
- `client/public/arcade-room.jpg`, `client/public/deck-mark.svg`: existing hero image and favicon/platform mark; retain where they serve the new composition.
- `client/public/manus-routes.json`: complete page-route set (`/`).
- `client/index.html`: page title, description, favicon, and display-font setup.
- `MOTION-REFERENCES.md`: concise sourced map of the user-provided references and evidence limitations.

No account system, application server, or database is needed. Use the existing `framer-motion` dependency and current icon set; do not add a component/animation package just to reproduce the supplied references. The static build output remains `dist/public`; the configured development port remains 3000.

## Design

### Design Movement

Kinetic neo-arcade editorial: a living launch deck where luminous signal hardware meets contemporary product-motion choreography. It keeps WASM//DECK's unmistakable archive identity but replaces a static hero with a responsive, tactile focal scene.

### Core Principles

1. Make the archive feel alive; every movement should point toward browsing, selecting, or launching a game.
2. Let user intent direct motion: hover, keyboard focus, press, and filter changes receive clear local responses.
3. Preserve scanability and immediate function: titles, metadata, search, and launch actions stay visible and independent of decorative motion.
4. Treat performance and reduced-motion preference as design inputs; animate only a bounded visible/changed set.

### Color Philosophy

Keep the ink, graphite, ivory, chartreuse, and lavender system, then introduce sparse electric cyan and ultraviolet gradients inside the hero stage. The archive remains calm enough to read; energized color lives at the deck's edge, in motion trails, and on the active item—not as a permanent full-screen neon wash.

### Layout Paradigm

A wide, left-anchored console hero anchors the page: oversized editorial copy on one side and a layered, perspective arcade stage on the other. A compact ticker/progress trace hands attention down to the catalog. Below, a narrow collection rail leads into a fluid game shelf; on mobile, the rail becomes horizontal chips and the stage collapses into a smaller portrait-friendly composition. Do not center every region inside one repeated card grid.

### Signature Elements

1. A shifting signal portal: layered game-art tiles suspended over an orbital halo, with restrained cursor-responsive perspective and a slow CSS drift.
2. A thin chartreuse scan/progress trace that sweeps across the top and punctuates state changes.
3. Tactile catalog tiles: localized depth, image lift, and a brief favorite/launch pulse, all settling quickly when interaction ends.

### Interaction Philosophy

Motion communicates state, not decoration alone. Hero actions rise in sequence; hover, keyboard focus, and press use related but distinct feedback; filters show results immediately while cards leave/reflow with a short transition; the existing in-deck modal preserves continuity with its selected card. Do not use hover-only behavior, hold-to-confirm for ordinary launches, or particle effects that hide controls. External launch URLs, source-status wording, favorites, and recent-history behavior remain unchanged.

### Animation

Use a 0.7–1.0 second staged hero entrance with 45–70 ms text/action offsets, then stop. Add a restrained ambient orbit/float only inside the hero stage, using transform/opacity and no continuous full-page particle field. Reveal the first visible catalog group with a short, capped stagger; later items animate once as they enter view. Card hover/focus uses a small lift (3–6 px), subtle cover scale, and a quick spring settle; press returns toward the surface. Filter changes animate only the bounded loaded set with presence-aware exits and layout reflow, while search/filter computation stays synchronous and results remain accessible. Avoid layout-property animation across the whole page, excessive blur, long waits, and constant trail/glow effects. `prefers-reduced-motion` removes stagger, perspective/parallax, major transforms, and loops; state changes remain immediate with at most short opacity feedback.

### Typography System

Retain Space Grotesk for expressive display headlines, Inter for interface/body text, and DM Mono for record counts and technical labels. Hero words may reveal in small line-level units; never animate glyphs so individually that the heading delays comprehension. Catalog titles and metadata remain stable.

### Brand Essence

A browser-first index for discovering WebAssembly game ports and preservation projects, now presented as a tactile animated launch deck. **Energetic, curious, precise.**

### Brand Voice

Confident, archival, and brief; it invites exploration without promising that a source link is still live.

- “A whole library, one browser tab.”
- “Find a port. Check the details. Follow the source.”

### Wordmark & Logo

Keep the custom W-as-signal-pulse mark and split `WASM//DECK` wordmark. A single chartreuse signal trace may animate on entry; the actual brand mark remains legible and static under reduced-motion preference.

### Signature Brand Color

Electric chartreuse `#c8f36a`, used for the scan trace, active item, and primary browse/launch actions.
