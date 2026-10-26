import React from 'react';
import { 
  Play, 
  ExternalLink, 
  Star, 
  Trash2
} from 'lucide-react';
import { GameThumbnail } from './GameThumbnail';
import { playHudClick, playLaunchEngine } from '../utils/soundEffects';

export function ListView({
  games,
  onPlayInDeck,
  favorites,
  onToggleFavorite,
  onDeleteCustomGame
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0E1017] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-[#0A0D15] text-slate-400 border-b border-white/[0.06]">
            <tr>
              <th className="py-2.5 px-3 w-8 text-center">★</th>
              <th className="py-2.5 px-3 w-20">Cover</th>
              <th className="py-2.5 px-3 font-sans font-medium">Game Title</th>
              <th className="py-2.5 px-3">Engine</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Memory</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] text-slate-300">
            {games.map(game => {
              const isFav = favorites.has(game.id);

              return (
                <tr key={game.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() => { playHudClick(); onToggleFavorite(game.id); }}
                      className="text-slate-500 hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  </td>

                  {/* Thumbnail Preview Cell */}
                  <td className="py-2 px-3">
                    <div 
                      className="w-14 h-9 rounded overflow-hidden border border-white/[0.08] bg-[#07090E] shrink-0 cursor-pointer"
                      onClick={() => {
                        playLaunchEngine();
                        if (game.iframeCompatible) {
                          onPlayInDeck(game);
                        } else {
                          window.open(game.primaryUrl, '_blank', 'noopener,noreferrer');
                        }
                      }}
                    >
                      <GameThumbnail
                        src={game.thumbnailUrl}
                        title={game.title}
                        category={game.category}
                        aspect="aspect-auto"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  </td>

                  <td className="py-2 px-3 font-sans font-medium text-white">
                    <span 
                      onClick={() => {
                        playLaunchEngine();
                        if (game.iframeCompatible) {
                          onPlayInDeck(game);
                        } else {
                          window.open(game.primaryUrl, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      className="truncate group-hover:text-slate-200 transition-colors cursor-pointer block"
                    >
                      {game.title}
                    </span>
                  </td>

                  <td className="py-2 px-3 text-slate-400 truncate max-w-xs">
                    {game.engine}
                  </td>

                  <td className="py-2 px-3 text-slate-400 capitalize">
                    {game.category.replace('-', ' ')}
                  </td>

                  <td className="py-2 px-3 text-slate-400">
                    {game.memoryEst}
                  </td>

                  <td className="py-2 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          playLaunchEngine();
                          if (game.iframeCompatible) {
                            onPlayInDeck(game);
                          } else {
                            window.open(game.primaryUrl, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        className="min-btn min-btn-primary py-1 px-3 text-xs"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Play</span>
                      </button>

                      {game.custom && (
                        <button
                          onClick={() => {
                            playHudClick();
                            onDeleteCustomGame(game.id);
                          }}
                          className="min-btn py-1 px-2 text-slate-500 hover:text-rose-400"
                          title="Delete custom game"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
