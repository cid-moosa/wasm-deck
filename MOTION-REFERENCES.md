# Motion and UI reference notes

Research of the user-supplied references, recorded 2026-11-16. These links are tools, component libraries, or inspiration sites—not a mandate to install every package. Findings are limited to the official pages or repository READMEs listed below; claims from marketing pages are not independent performance or accessibility verification.

## Motion and interaction tools

- [Motion](https://motion.dev/) documents React gestures, layout transitions, shared `layoutId` continuity, `AnimatePresence` exits, scroll-linked progress, springs, hardware-accelerated properties, and feature loading. Use this already-installed React animation family for a sequenced hero, card hover/focus/press feedback, filter reflow, and the existing in-deck dialog; keep motion selective.
- [Anime.js](https://animejs.com/) shows keyframes, easing, timelines, stagger, scroll observation, responsive scoping, and draggable spring examples. These are choreography references; its homepage is not a catalog-design guide, and we do not need a second engine.
- [GSAP](https://gsap.com/) presents UI, scroll, SVG and text animation tools, easing, and choreographed sequences. Treat it as an alternative engine rather than a dependency to add alongside Motion.
- [Rive](https://rive.app/) describes state machines, data binding, and reusable animated UI/game components, while explicitly distinguishing text-heavy pages where HTML is a better fit. No Rive asset or runtime is needed for this catalog.
- [Spline](https://spline.design/) demonstrates event-driven 3D scene states such as Start, Scroll, and Hover, and offers web publishing. Use explicit interaction states as an idea; do not embed a 3D runtime merely because the tool supports it.
- [Particles Casberry](https://particles.casberry.in/) describes gesture controls, adjustable effects, and a data-oriented high-particle-count update model. Browser access to its live simulator was blocked, so the running visual behavior was not verified. Any particle accent here should be small, optional, and non-obstructive.

## Component and site references

- [KokonutUI](https://kokonutui.com/) documents React/Tailwind/Motion components, including async button states, keyboard support, cancelable hold interactions, reduced-motion considerations, and a canvas terrain. Its examples suggest localized feedback, not a whole-site template; do not add hold-to-confirm to normal game launches.
- [Bklit](https://bklit.com/) shows a clear landing hierarchy with a concise hero, browse action, `⌘K` search affordance, theme control, and grouped cards. The inspected page does not establish precise animation behavior.
- [Skiper UI](https://skiper-ui.com/) advertises scroll-triggered image reveals, clip-path/brightness transitions, and a progress indicator. The specific preview/source was not available without Pro access; timings and accessible behavior were not verified.
- [Manus](https://manus.im/) uses a prompt-like primary invitation with a small set of visible activity categories. The extracted page gave no reliable evidence about animation behavior.
- [Swishy](https://www.swishy.ai/) presents an animation template gallery, including spring-staggered elements, slide-in notifications, reveal effects, and progress rings. Those are descriptions/prompts; the inspected page did not establish exact runtime timing or implementation.

## Repository references

- [Pretext](https://github.com/chenglou/pretext) is a text measurement/layout library, not an animation library. Its README recommends preparing measurements once and reusing them across resize/layout calculations; it does not justify adding a dependency for this redesign.
- [Hairline](https://github.com/lucasmarkes/hairline) describes bounded, pointer- and keyboard-aware interactive line figures that yield to focus and can pause/resume ambient loops. Adapt the local-input principle with the existing Motion stack rather than adding Hairline.
- [ASCII Koi](https://github.com/pursurer/ascii-koi) describes a deterministic ASCII pond with pointer/touch/keyboard input, theme ripples, and a Space pause control. It is an ambient generative-art example, not a catalog UX pattern; a tiny character-based accent may be used only if it stays behind content and respects reduced motion.

## Implementation guardrails

Use the existing `framer-motion` dependency as the Motion React layer; do not add Anime.js, GSAP, Rive, Spline, KokonutUI, Skiper UI, Swishy, Hairline, Pretext, or a particle engine. Keep all catalog content and controls in normal HTML/React so they are immediately usable. Animate only the first visible items and the cards that enter or leave after filtering, not all 563 records at once. Use short entrance choreography, local hover/focus/press feedback, and filter-layout transitions. Keep keyboard interaction equivalent to pointer feedback, preserve game source URLs and the catalog's “not live-checked” wording, and honor `prefers-reduced-motion` by suppressing large transforms, staggering, parallax, and ambient loops.
