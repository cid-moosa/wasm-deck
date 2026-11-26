import { ArrowDownRight, ArrowRight, Shuffle } from "lucide-react";
import {
  m,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from "framer-motion";
import { useRef, type PointerEvent } from "react";
import type { GameRecord } from "@/data/catalog";

const introGroup: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.075, delayChildren: 0.08 } },
};

const introItem: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.68, ease: [0.22, 0.61, 0.36, 1] },
  },
};

type HeroDeckProps = {
  featuredGames: GameRecord[];
  catalogCount: number | null;
  categoryCount: number;
  multiplayerCount: number | null;
  randomDisabled: boolean;
  onRandom: () => void;
};

export default function HeroDeck({
  featuredGames,
  catalogCount,
  categoryCount,
  multiplayerCount,
  randomDisabled,
  onRandom,
}: HeroDeckProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const stageRef = useRef<HTMLDivElement>(null);
  const stageVisible = useInView(stageRef, { amount: 0.24 });
  const ambientMotion = !reducedMotion && stageVisible;
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const smoothX = useSpring(pointerX, { stiffness: 130, damping: 24, mass: 0.8 });
  const smoothY = useSpring(pointerY, { stiffness: 130, damping: 24, mass: 0.8 });
  const rotateY = useTransform(smoothX, [0, 1], [-5, 5]);
  const rotateX = useTransform(smoothY, [0, 1], [4, -4]);
  const featureOne = featuredGames[0];
  const featureTwo = featuredGames[1];
  const featureThree = featuredGames[2];

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width);
    pointerY.set((event.clientY - bounds.top) / bounds.height);
  };

  const resetPointer = () => {
    pointerX.set(0.5);
    pointerY.set(0.5);
  };

  const stats = [
    { value: catalogCount === null ? "—" : catalogCount.toLocaleString(), label: "catalog links" },
    { value: String(categoryCount).padStart(2, "0"), label: "collections" },
    { value: multiplayerCount === null ? "—" : multiplayerCount.toLocaleString(), label: "multiplayer tags" },
  ];

  return (
    <section className="hero-section hero-section--kinetic" aria-labelledby="hero-title">
      <m.div
        className="hero-copy"
        variants={introGroup}
        initial={reducedMotion ? false : "hidden"}
        animate="visible"
      >
        <m.div className="eyebrow hero-eyebrow" variants={introItem}>
          <span className="status-dot" /> WASM//DECK <span className="hero-eyebrow-divider">/</span> OPEN-WEB GAME INDEX
        </m.div>
        <m.h1 id="hero-title" variants={introItem}>
          A world of ports.<br />
          <em>One game deck.</em>
        </m.h1>
        <m.p className="hero-description" variants={introItem}>
          Browse WebAssembly ports, emulators, and preservation projects. Every entry points to a listed source; availability can change.
        </m.p>
        <m.div className="hero-actions" variants={introItem}>
          <a className="button button--lime hero-primary-action" href="#archive">
            Browse the archive <ArrowRight size={16} aria-hidden="true" />
          </a>
          <button className="button button--quiet" type="button" onClick={onRandom} disabled={randomDisabled}>
            <Shuffle size={15} aria-hidden="true" /> Random pick
          </button>
        </m.div>
        <m.div className="hero-proof" variants={introItem} role="group" aria-label="Catalog overview">
          {stats.map((stat) => (
            <div key={stat.label}>
              <m.strong key={stat.value} initial={reducedMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                {stat.value}
              </m.strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </m.div>
        <m.a className="hero-scroll-cue" href="#archive" variants={introItem}>
          <span>SCROLL TO EXPLORE</span><ArrowDownRight size={15} aria-hidden="true" />
        </m.a>
      </m.div>

      <div className="hero-visual-wrap">
        <m.div
          className="hero-stage"
          ref={stageRef}
          role="img"
          aria-label={`A dimensional arcade deck featuring ${featureOne?.title ?? "listed browser game projects"}. Availability is not live-checked.`}
          onPointerMove={handlePointerMove}
          onPointerLeave={resetPointer}
          style={reducedMotion ? undefined : { rotateX, rotateY }}
        >
          <div className="hero-stage-grid" />
          <div className="hero-stage-glow hero-stage-glow--lime" />
          <div className="hero-stage-glow hero-stage-glow--violet" />
          <m.div
            className="hero-orbit hero-orbit--outer"
            animate={ambientMotion ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 38, ease: "linear", repeat: ambientMotion ? Infinity : 0 }}
          >
            <span className="orbit-node orbit-node--lime" />
            <span className="orbit-node orbit-node--violet" />
          </m.div>
          <m.div
            className="hero-orbit hero-orbit--inner"
            animate={ambientMotion ? { rotate: -360 } : { rotate: 0 }}
            transition={{ duration: 29, ease: "linear", repeat: ambientMotion ? Infinity : 0 }}
          >
            <span className="orbit-node orbit-node--white" />
          </m.div>

          <m.div
            className="hero-floating-card hero-floating-card--left"
            animate={ambientMotion ? { y: [0, -9, 0], rotateZ: [-8, -6.5, -8] } : { y: 0, rotateZ: -8 }}
            transition={{ duration: 6.8, repeat: ambientMotion ? Infinity : 0, ease: "easeInOut" }}
          >
            <span className="hero-floating-index">01 / LISTED</span>
            <strong>{featureTwo?.title ?? "BROWSER PORTS"}</strong>
            <span className="hero-floating-meta">{featureTwo?.category ?? "OPEN WEB ARCHIVE"}</span>
          </m.div>
          <m.div
            className="hero-floating-card hero-floating-card--right"
            animate={ambientMotion ? { y: [0, 8, 0], rotateZ: [7, 5.5, 7] } : { y: 0, rotateZ: 7 }}
            transition={{ duration: 7.6, repeat: ambientMotion ? Infinity : 0, ease: "easeInOut", delay: 0.35 }}
          >
            <span className="hero-floating-index">02 / SOURCE</span>
            <strong>{featureThree?.title ?? "PRESERVED PLAY"}</strong>
            <span className="hero-floating-meta">NOT LIVE-CHECKED</span>
          </m.div>

          <div className="hero-console-anchor">
            <m.div
              className="hero-console"
              initial={reducedMotion ? false : { opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <div className="console-topline">
                <span><i className="console-signal" /> SYSTEM / READY</span>
                <span>WASM 001—563</span>
              </div>
              <div className="console-screen">
                <div className="console-screen-photo" />
                <div className="console-screen-scanlines" />
                <div className="console-screen-content">
                  <span className="console-screen-label">NOW BROWSING</span>
                  <strong>{featureOne?.title ?? "THE OPEN WEB"}</strong>
                  <span className="console-screen-status"><i /> INDEX SIGNAL FOUND</span>
                </div>
                <m.div
                  className="console-screen-orb"
                  animate={ambientMotion ? { scale: [0.92, 1.08, 0.92], opacity: [0.45, 0.74, 0.45] } : { scale: 1, opacity: 0.55 }}
                  transition={{ duration: 5.2, repeat: ambientMotion ? Infinity : 0, ease: "easeInOut" }}
                />
              </div>
              <div className="console-control-row">
                <div className="console-stick"><span /></div>
                <div className="console-control-label"><strong>DISCOVER / DECODE</strong><span>FOLLOW THE SOURCE</span></div>
                <div className="console-buttons"><i /><i /><i /></div>
              </div>
              <div className="console-edge-glow" />
            </m.div>
          </div>

          <div className="hero-stage-label hero-stage-label--top">PORTS <span>●</span> EMULATORS <span>●</span> PRESERVATION</div>
          <div className="hero-stage-label hero-stage-label--bottom">SOURCE INDEX // NOT A HOST</div>
        </m.div>
        <div className="hero-visual-caption"><span>PRESS START TO EXPLORE</span><span>01 — 563 / OPEN INDEX</span></div>
      </div>
    </section>
  );
}
