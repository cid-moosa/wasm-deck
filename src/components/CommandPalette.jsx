import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Star, ArrowRight } from 'lucide-react';
import { GameThumbnail } from './GameThumbnail';
import { playHudClick, playLaunchEngine } from '../utils/soundEffects';

export function CommandPalette({
  isOpen,
  onClose,
  games,
  onPlayInDeck,
  onSelectGame,
  favorites,
  onToggleFavorite
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter games based on query
  const filteredGames = games.filter(g => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      g.title.toLowerCase().includes(q) ||
      g.engine.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q) ||
      g.delivery.toLowerCase().includes(q) ||
      g.notes.toLowerCase().includes(q)
    );
  }).slice(0, 15);

  const handleLaunchGame = (game) => {
    playLaunchEngine();
    if (onSelectGame) {
      onSelectGame(game);
    } else if (onPlayInDeck) {
      if (game.iframeCompatible) {
        onPlayInDeck(game);
      } else {
        window.open(game.primaryUrl, '_blank', 'noopener,noreferrer');
      }
    } else {
      if (game.iframeCompatible) {
        // fallback
      }
      window.open(game.primaryUrl, '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  // Keyboard navigation inside palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredGames.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredGames.length) % Math.max(1, filteredGames.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredGames[selectedIndex]) {
          handleLaunchGame(filteredGames[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredGames, selectedIndex, onPlayInDeck, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/80 backdrop-blur-xl animate-fadeIn cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass-modal rounded-2xl max-w-2xl w-full border border-white/[0.16] shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-modalEnter cursor-default"
      >
        
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08] bg-[#0A0D15]">
          <Search className="w-4 h-4 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Search verified WebAssembly games to launch instantly..."
            className="w-full bg-transparent text-white placeholder-slate-500 font-sans text-sm focus:outline-none"
          />
          {query && (
            <button 
              onClick={() => setQuery("")}
              className="text-slate-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="text-[10px] bg-white/[0.05] border border-white/[0.1] px-1.5 py-0.5 rounded text-slate-400 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto flex-1 divide-y divide-white/[0.03] p-2">
          {filteredGames.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              No WebAssembly ports matching "<span className="text-white">{query}</span>"
            </div>
          ) : (
            filteredGames.map((game, idx) => {
              const isSelected = idx === selectedIndex;
              const isFav = favorites.has(game.id);

              return (
                <div
                  key={game.id}
                  onClick={() => handleLaunchGame(game)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all ${
                    isSelected ? 'bg-indigo-600/15 border border-indigo-500/30 shadow-sm' : 'hover:bg-white/[0.03] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    
                    {/* Visual Identification Thumbnail */}
                    <div className="w-14 h-9 rounded-md overflow-hidden shrink-0 border border-white/[0.08] bg-[#0A0D15]">
                      <GameThumbnail
                        src={game.thumbnailUrl}
                        title={game.title}
                        category={game.category}
                        aspect="aspect-auto"
                        className="w-full h-full"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-white truncate">
                          {game.title}
                        </span>
                        {isFav && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />}
                        {game.custom && (
                          <span className="text-[9px] bg-sky-950/80 text-sky-300 px-1 rounded border border-sky-800/50">
                            CUSTOM
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 truncate mt-0.5">
                        <span className="text-slate-300">{game.engine}</span>
                        <span>•</span>
                        <span>{game.memoryEst}</span>
                        <span>•</span>
                        <span className={game.iframeCompatible ? 'text-emerald-400' : 'text-slate-400'}>
                          {game.iframeCompatible ? 'Deck Ready' : 'External'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playHudClick();
                        onToggleFavorite(game.id);
                      }}
                      className="p-1.5 rounded text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
                      title={isFav ? "Remove Favorite" : "Add to Favorites"}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                    <span className="text-[11px] font-mono font-medium text-slate-400 flex items-center gap-1 group-hover:text-white">
                      <span>Launch</span>
                      <ArrowRight className="w-3 h-3 text-indigo-400" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-[#0A0D15] border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <span><kbd className="bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.08] text-slate-400">↑↓</kbd> Navigate</span>
            <span><kbd className="bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.08] text-slate-400">↵</kbd> Play Game</span>
          </div>
          <span>{filteredGames.length} of {games.length} games</span>
        </div>

      </div>
    </div>
  );
}
