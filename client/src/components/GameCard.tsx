import { ArrowUpRight, Gamepad2, MonitorPlay, Star, Users } from "lucide-react";
import { m, useReducedMotion, type Variants } from "framer-motion";
import { forwardRef, useState } from "react";
import { categoryLabel, safeGameUrl, type GameRecord } from "@/data/catalog";

type GameCardProps = {
  game: GameRecord;
  isFavorite: boolean;
  viewMode: "grid" | "list";
  animationIndex: number;
  onToggleFavorite: (id: string) => void;
  onOpenSource: (game: GameRecord) => void;
  onPlayInDeck: (game: GameRecord) => void;
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 22, scale: 0.975 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.46,
      delay: Math.min((index % 6) * 0.045, 0.225),
      ease: [0.22, 0.61, 0.36, 1],
    },
  }),
  exit: { opacity: 0, y: -8, scale: 0.985, transition: { duration: 0.18, ease: "easeOut" } },
};

function initials(title: string): string {
  return title
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

const GameCard = forwardRef<HTMLElement, GameCardProps>(function GameCard(
  { game, isFavorite, viewMode, animationIndex, onToggleFavorite, onOpenSource, onPlayInDeck },
  ref,
) {
  const [imageFailed, setImageFailed] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const motionEnabled = prefersReducedMotion !== true;
  const launchUrl = safeGameUrl(game.primaryUrl);
  const canPlayInDeck = Boolean(launchUrl);
  const favoritePulse = isFavorite ? { scale: [1, 1.16, 1] } : { scale: 1 };

  return (
    <m.article
      ref={ref}
      className={`game-card game-card--${viewMode}`}
      custom={animationIndex}
      variants={cardVariants}
      initial={motionEnabled ? "hidden" : false}
      whileInView={motionEnabled ? "visible" : undefined}
      viewport={{ once: true, amount: 0.16 }}
      exit={motionEnabled ? "exit" : undefined}
      layout="position"
      transition={{ layout: { duration: 0.42, ease: [0.22, 0.61, 0.36, 1] } }}
      whileHover={motionEnabled ? { y: -5, rotateX: 1, scale: 1.012 } : undefined}
      style={{ transformPerspective: 1100 }}
    >
      <m.div
        className="game-art"
        layoutId={`game-art-${game.id}`}
        transition={{ layout: { duration: 0.48, ease: [0.22, 0.61, 0.36, 1] } }}
        onClick={() => canPlayInDeck && onPlayInDeck(game)}
        style={{ cursor: canPlayInDeck ? "pointer" : "default" }}
      >
        {game.thumbnailUrl && !imageFailed ? (
          <img
            src={game.thumbnailUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className={`cover-fallback cover-fallback--${game.category}`} aria-hidden="true">
            <span>{initials(game.title)}</span>
            <Gamepad2 size={20} strokeWidth={1.5} />
          </div>
        )}
        <div className="art-shade" aria-hidden="true" />
        {game.popular && <span className="popular-flag">POPULAR PICK</span>}
        <m.button
          className={`favorite-toggle${isFavorite ? " is-active" : ""}`}
          type="button"
          aria-label={isFavorite ? `Remove ${game.title} from favorites` : `Add ${game.title} to favorites`}
          aria-pressed={isFavorite}
          onClick={() => onToggleFavorite(game.id)}
          whileHover={motionEnabled ? { scale: 1.08 } : undefined}
          whileTap={motionEnabled ? { scale: 0.84, rotate: -7 } : undefined}
          animate={favoritePulse}
          transition={{ type: "spring", stiffness: 430, damping: 18, duration: 0.36 }}
        >
          <Star size={16} fill={isFavorite ? "currentColor" : "none"} aria-hidden="true" />
        </m.button>
      </m.div>

      <div className="game-card-content">
        <div className="game-card-heading">
          <div>
            <span className="game-category">{categoryLabel(game.category)}</span>
            <h3 title={game.title}>{game.title}</h3>
          </div>
          {game.multiplayer && (
            <span className="tiny-icon-label" title="Listed as multiplayer-capable">
              <Users size={14} aria-hidden="true" />
              <span className="sr-only">Multiplayer listed</span>
            </span>
          )}
        </div>

        <p className="game-engine" title={game.engine ?? "Runtime not supplied"}>
          {game.engine || "Runtime not supplied"}
        </p>

        <div className="game-card-meta">
          {game.memoryEst && <span>{game.memoryEst}</span>}
          <span className="source-status">
            <MonitorPlay size={13} aria-hidden="true" />
            <span>Play in-window</span>
          </span>
        </div>

        <div className="game-card-footer">
          <span className="catalog-note">In-Deck Ready</span>
          {canPlayInDeck ? (
            <m.button
              className="card-launch"
              type="button"
              onClick={() => onPlayInDeck(game)}
              whileHover={motionEnabled ? { y: -2 } : undefined}
              whileTap={motionEnabled ? { scale: 0.96 } : undefined}
            >
              <MonitorPlay size={15} aria-hidden="true" /> Play in-deck
            </m.button>
          ) : (
            <span className="card-launch card-launch--disabled" aria-disabled="true">
              No launch link
            </span>
          )}
        </div>
      </div>
    </m.article>
  );
});

export default GameCard;
