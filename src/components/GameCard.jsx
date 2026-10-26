import React from 'react';
import { 
  Play, 
  ExternalLink, 
  Star, 
  Trash2,
  Share2
} from 'lucide-react';
import { GameThumbnail } from './GameThumbnail';
import { playHudClick, playLaunchEngine } from '../utils/soundEffects';

export function GameCard({
  game,
  onPlayInDeck,
  isFavorite,
  onToggleFavorite,
  onDeleteCustomGame,
  onInspectGame
}) {
  const handleCardClick = (e) => {
    playLaunchEngine();
    if (game.iframeCompatible) {
      onPlayInDeck(game);
    } else {
      window.open(game.primaryUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleInspect = (e) => {
    e.stopPropagation();
    playHudClick();
    if (onInspectGame) {
      onInspectGame(game);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      onMouseEnter={() => {
        if (onInspectGame) onInspectGame(game);
      }}
      className="minimal-card flex flex-col justify-between group overflow-hidden cursor-pointer select-none"
    >
      {/* Game Thumbnail with Clean Hover Zoom */}
      <div className="relative w-full overflow-hidden bg-[#07090E] aspect-video">
        <GameThumbnail
          src={game.thumbnailUrl}
          title={game.title}
          category={game.category}
          aspect="aspect-video"
          className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
        />

        {/* Top-Right Favorite / Delete Actions */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
          {game.custom && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                playHudClick();
                onDeleteCustomGame(game.id);
              }}
              className="p-1.5 rounded-md bg-black/70 backdrop-blur-sm text-slate-400 hover:text-rose-400 transition-colors"
              title="Delete custom game"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              playHudClick();
              onToggleFavorite(game.id);
            }}
            className={`p-1.5 rounded-md bg-black/60 backdrop-blur-sm transition-colors ${
              isFavorite 
                ? 'text-amber-400' 
                : 'text-slate-400 opacity-0 group-hover:opacity-100 hover:text-white'
            }`}
            title={isFavorite ? "Remove favorite" : "Add to favorites"}
          >
            <Star className={`w-3.5 h-3.5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Minimal Play Hover Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <span className="min-btn min-btn-primary py-1.5 px-3.5 shadow-lg flex items-center gap-1.5 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-200">
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play</span>
          </span>
        </div>
      </div>

      {/* Card Info Details */}
      <div className="p-3.5 flex flex-col justify-between flex-1">
        <div>
          {/* Game Title */}
          <h3 className="font-medium text-sm text-white tracking-tight leading-snug line-clamp-1 group-hover:text-slate-200 transition-colors">
            {game.title}
          </h3>

          {/* Minimalist Metadata Subline */}
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono">
            <span className="truncate">{game.engine}</span>
            <span className="text-slate-600">•</span>
            <span className="shrink-0">{game.memoryEst}</span>
          </div>
        </div>

        {/* Bottom Status Tag */}
        <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span className="capitalize">
            {game.category.replace('-', ' ')}
          </span>
          <span className={game.iframeCompatible ? "text-emerald-400" : "text-slate-400"}>
            {game.iframeCompatible ? "Instant Deck" : "Direct Window"}
          </span>
        </div>
      </div>
    </div>
  );
}
