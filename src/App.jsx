import React, { useState, useEffect, useMemo } from 'react';
import { HeaderHUD } from './components/HeaderHUD';
import { FilterBar } from './components/FilterBar';
import { GameCard } from './components/GameCard';
import { ListView } from './components/ListView';
import { ConsoleTheater } from './components/ConsoleTheater';
import { StorageGuideModal } from './components/StorageGuideModal';
import { SecurityAuditModal } from './components/SecurityAuditModal';
import { NotepadExporterModal } from './components/NotepadExporterModal';
import { CustomPortModal } from './components/CustomPortModal';
import { CommandPalette } from './components/CommandPalette';
import { GameTestLogModal } from './components/GameTestLogModal';
import { AboutModal } from './components/AboutModal';
import { ThemeModal } from './components/ThemeModal';
import { ThreeDeckHero } from './components/ThreeDeckHero';
import { VERIFIED_WASM_GAMES } from './data/gamesData';
import { getHardwareTelemetry } from './services/hardwareTelemetry';
import { playHudClick, playLaunchEngine } from './utils/soundEffects';
import { 
  Gamepad2, 
  Shuffle, 
  ExternalLink
} from 'lucide-react';

export default function App() {
  // Telemetry state
  const [telemetry, setTelemetry] = useState({
    webgpuAvailable: false,
    webgpuAdapter: null,
    crossOriginIsolated: false,
    deviceMemoryGB: 8,
    hardwareConcurrency: 8,
    storageEstimate: { usageFormatted: "0 MB", quotaFormatted: "Loading...", percentUsed: 0 },
    gamepadConnected: false,
    gamepadCount: 0,
    gamepadName: null
  });

  const [inspectedGame, setInspectedGame] = useState(null);

  // Local storage state
  const [customGames, setCustomGames] = useState(() => {
    try {
      const saved = localStorage.getItem('wasm_deck_custom_games');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('wasm_deck_favorites');
      return saved ? new Set(JSON.parse(saved)) : new Set(['simpsons-hit-and-run', 'gta-vice-city', 'doom-1-prboom', 'gta-5']);
    } catch {
      return new Set(['simpsons-hit-and-run', 'gta-vice-city', 'doom-1-prboom', 'gta-5']);
    }
  });

  const [recentlyPlayed, setRecentlyPlayed] = useState(() => {
    try {
      const saved = localStorage.getItem('wasm_deck_recent');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [aspectRatio, setAspectRatio] = useState(() => {
    return localStorage.getItem('wasm_deck_aspect') || '16-9';
  });

  const [crtFilter, setCrtFilter] = useState(() => {
    return localStorage.getItem('wasm_deck_crt') === 'true';
  });

  const [audioMuted, setAudioMutedState] = useState(() => {
    return localStorage.getItem('wasm_deck_muted') === 'true';
  });

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDelivery, setSelectedDelivery] = useState("all");
  const [multiplayerOnly, setMultiplayerOnly] = useState(false);
  const [deckReadyOnly, setDeckReadyOnly] = useState(false);
  const [sortBy, setSortBy] = useState("featured");
  const [viewMode, setViewMode] = useState("grid");

  // Modals & Test Log
  const [activeGame, setActiveGame] = useState(null);
  const [isStorageGuideOpen, setIsStorageGuideOpen] = useState(false);
  const [isSecurityAuditOpen, setIsSecurityAuditOpen] = useState(false);
  const [isExporterOpen, setIsExporterOpen] = useState(false);
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isTestLogOpen, setIsTestLogOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Visual Theme State
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('wasm_deck_theme') || 'liquid-glass';
    } catch {
      return 'liquid-glass';
    }
  });

  const handleSelectTheme = (newTheme) => {
    setTheme(newTheme);
    try {
      localStorage.setItem('wasm_deck_theme', newTheme);
    } catch {
      // ignore local storage errors
    }
  };

  // Game verification & runtime test logs
  const [testLogs, setTestLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('wasm_deck_test_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Telemetry init
  useEffect(() => {
    let mounted = true;
    getHardwareTelemetry().then(data => {
      if (mounted) setTelemetry(data);
    });

    const handleGamepadConnected = () => {
      getHardwareTelemetry().then(data => {
        if (mounted) setTelemetry(data);
      });
    };

    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadConnected);

    return () => {
      mounted = false;
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener("gamepaddisconnected", handleGamepadConnected);
    };
  }, []);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save state
  useEffect(() => {
    try {
      localStorage.setItem('wasm_deck_favorites', JSON.stringify([...favorites]));
    } catch {}
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem('wasm_deck_custom_games', JSON.stringify(customGames));
    } catch {}
  }, [customGames]);

  useEffect(() => {
    try {
      localStorage.setItem('wasm_deck_recent', JSON.stringify(recentlyPlayed));
    } catch {}
  }, [recentlyPlayed]);

  useEffect(() => {
    try {
      localStorage.setItem('wasm_deck_aspect', aspectRatio);
    } catch {}
  }, [aspectRatio]);

  useEffect(() => {
    try {
      localStorage.setItem('wasm_deck_crt', String(crtFilter));
    } catch {}
  }, [crtFilter]);

  useEffect(() => {
    try {
      localStorage.setItem('wasm_deck_muted', String(audioMuted));
    } catch {}
  }, [audioMuted]);

  useEffect(() => {
    try {
      localStorage.setItem('wasm_deck_test_logs', JSON.stringify(testLogs));
    } catch {}
  }, [testLogs]);

  // Combined games catalog
  const allGames = useMemo(() => {
    return [...customGames, ...VERIFIED_WASM_GAMES];
  }, [customGames]);

  // Filter and sort games
  const filteredGames = useMemo(() => {
    return allGames.filter(game => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = 
          game.title.toLowerCase().includes(q) ||
          game.engine.toLowerCase().includes(q) ||
          game.category.toLowerCase().includes(q) ||
          game.delivery.toLowerCase().includes(q) ||
          game.notes.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (selectedCategory === "favorites") {
        if (!favorites.has(game.id)) return false;
      } else if (selectedCategory === "recent") {
        if (!recentlyPlayed.includes(game.id)) return false;
      } else if (selectedCategory === "popular") {
        if (!game.popular) return false;
      } else if (selectedCategory !== "all") {
        if (game.category !== selectedCategory) return false;
      }

      if (selectedDelivery !== "all") {
        if (game.delivery !== selectedDelivery) return false;
      }

      if (multiplayerOnly && !game.multiplayer) {
        return false;
      }

      if (deckReadyOnly && !game.iframeCompatible) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      } else if (sortBy === "engine") {
        return a.engine.localeCompare(b.engine);
      }
      return 0;
    });
  }, [allGames, searchQuery, selectedCategory, selectedDelivery, multiplayerOnly, deckReadyOnly, sortBy, favorites, recentlyPlayed]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = {
      all: allGames.length,
      popular: allGames.filter(g => g.popular).length,
      "aaa-console": 0,
      "nintendo-decomp": 0,
      "retro-arcade": 0,
      "flash-classics": 0,
      "classic-pc": 0,
      "modern-indie": 0,
      hubs: 0,
      favorites: favorites.size,
      recent: recentlyPlayed.length
    };

    allGames.forEach(g => {
      if (counts[g.category] !== undefined) {
        counts[g.category]++;
      }
    });

    return counts;
  }, [allGames, favorites, recentlyPlayed]);

  const handleToggleFavorite = (id) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handlePlayInDeck = (game) => {
    setActiveGame(game);
    setRecentlyPlayed(prev => {
      const filtered = prev.filter(item => item !== game.id);
      return [game.id, ...filtered].slice(0, 15);
    });
  };

  const handleRandomLaunch = () => {
    const candidates = allGames.filter(g => g.category === 'aaa-console' || g.category === 'classic-pc' || g.category === 'retro-arcade');
    const randomGame = candidates[Math.floor(Math.random() * candidates.length)] || allGames[0];
    
    if (randomGame.iframeCompatible) {
      handlePlayInDeck(randomGame);
    } else {
      window.open(randomGame.primaryUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleAddCustomGame = (newGame) => {
    setCustomGames(prev => [newGame, ...prev]);
  };

  const handleDeleteCustomGame = (id) => {
    setCustomGames(prev => prev.filter(g => g.id !== id));
  };

  const currentHeroGame = inspectedGame || allGames[0] || {};

  return (
    <div data-theme={theme} className={`min-h-screen text-slate-100 flex flex-col clean-bg selection:bg-white selection:text-black relative overflow-x-hidden theme-${theme}`}>
      
      {/* Ambient Fluid Background Refraction Orbs for Liquid Glass */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="liquid-blob liquid-blob-1" />
        <div className="liquid-blob liquid-blob-2" />
        <div className="liquid-blob liquid-blob-3" />
      </div>

      {/* Top Header */}
      <HeaderHUD
        telemetry={telemetry}
        onOpenStorageGuide={() => setIsStorageGuideOpen(true)}
        onOpenSecurityAudit={() => setIsSecurityAuditOpen(true)}
        onOpenExporter={() => setIsExporterOpen(true)}
        onOpenAddCustom={() => setIsAddCustomOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenTestLogs={() => setIsTestLogOpen(true)}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenTheme={() => setIsThemeOpen(true)}
        testLogCount={testLogs.length}
        audioMuted={audioMuted}
        setAudioMutedState={setAudioMutedState}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* Minimalist Hero Section */}
        <section className="mb-8 rounded-2xl bg-[#0E1017] border border-white/[0.08] p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-8">
            
            {/* Left Column: Clear, confident typography */}
            <div className="lg:col-span-7">
              <span className="min-badge mb-3">
                Zero Cloud Streaming • Pure WebAssembly
              </span>

              <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-white leading-tight">
                WebAssembly Game Archive
              </h1>

              <p className="text-sm text-slate-400 mt-2.5 max-w-xl leading-relaxed">
                Over 560 verified native game engines, decompilations, and ports running entirely client-side in your modern browser sandbox.
              </p>

              {/* Action buttons */}
              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={handleRandomLaunch}
                  className="min-btn min-btn-primary py-2 px-4 shadow-sm"
                  title="Launch a random verified game"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Random Game</span>
                </button>

                <div className="text-xs font-mono text-slate-400 pl-2">
                  <strong className="text-white font-medium">{allGames.length}</strong> games verified
                </div>
              </div>
            </div>

            {/* Right Column: Clean 3D Interactive Showcase */}
            <div className="lg:col-span-5 w-full">
              <ThreeDeckHero 
                activeGameTitle={currentHeroGame.title}
                activeGameThumb={currentHeroGame.thumbnailUrl}
                activeGameCategory={currentHeroGame.category}
                onLaunchGame={() => {
                  if (currentHeroGame.iframeCompatible) {
                    handlePlayInDeck(currentHeroGame);
                  } else {
                    window.open(currentHeroGame.primaryUrl, '_blank', 'noopener,noreferrer');
                  }
                }}
              />
            </div>

          </div>
        </section>

        {/* Filters & Search */}
        <FilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedDelivery={selectedDelivery}
          setSelectedDelivery={setSelectedDelivery}
          multiplayerOnly={multiplayerOnly}
          setMultiplayerOnly={setMultiplayerOnly}
          deckReadyOnly={deckReadyOnly}
          setDeckReadyOnly={setDeckReadyOnly}
          sortBy={sortBy}
          setSortBy={setSortBy}
          viewMode={viewMode}
          setViewMode={setViewMode}
          categoryCounts={categoryCounts}
        />

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-4 px-1">
          <span>
            Showing <span className="text-white font-medium">{filteredGames.length}</span> of {allGames.length} games
          </span>

          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-slate-300 hover:text-white transition-colors"
            >
              Clear search
            </button>
          )}
        </div>

        {/* Game Catalog: Grid or List */}
        {filteredGames.length === 0 ? (
          <div className="rounded-xl border border-white/[0.08] bg-[#0E1017] p-12 text-center my-6">
            <Gamepad2 className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="font-medium text-base text-white mb-1">No Games Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
              No titles match your current filter criteria.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSelectedDelivery("all");
                setMultiplayerOnly(false);
                setDeckReadyOnly(false);
              }}
              className="min-btn min-btn-primary py-1.5 px-3.5 mx-auto"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredGames.map(game => (
              <GameCard
                key={game.id}
                game={game}
                onPlayInDeck={handlePlayInDeck}
                isFavorite={favorites.has(game.id)}
                onToggleFavorite={handleToggleFavorite}
                onDeleteCustomGame={handleDeleteCustomGame}
                onInspectGame={setInspectedGame}
              />
            ))}
          </div>
        ) : (
          <ListView
            games={filteredGames}
            onPlayInDeck={handlePlayInDeck}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onDeleteCustomGame={handleDeleteCustomGame}
          />
        )}

      </main>

      {/* Minimal Footer */}
      <footer className="mt-auto border-t border-white/[0.08] py-6 px-4 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>WASM//DECK • Client-Side WebAssembly Launcher</span>
          <div className="flex items-center gap-4 text-slate-400">
            <button onClick={() => setIsStorageGuideOpen(true)} className="hover:text-white">Storage</button>
            <button onClick={() => setIsSecurityAuditOpen(true)} className="hover:text-white">Security</button>
            <button onClick={() => setIsExporterOpen(true)} className="hover:text-white">Export</button>
          </div>
        </div>
      </footer>

      {/* In-App Console Theater Viewport */}
      {activeGame && (
        <ConsoleTheater
          game={activeGame}
          onClose={() => setActiveGame(null)}
          aspectRatio={aspectRatio}
          setAspectRatio={setAspectRatio}
          crtFilter={crtFilter}
          setCrtFilter={setCrtFilter}
        />
      )}

      {/* Modals */}
      {isStorageGuideOpen && (
        <StorageGuideModal 
          onClose={() => setIsStorageGuideOpen(false)} 
          telemetry={telemetry} 
        />
      )}

      {isSecurityAuditOpen && (
        <SecurityAuditModal 
          onClose={() => setIsSecurityAuditOpen(false)} 
        />
      )}

      {isExporterOpen && (
        <NotepadExporterModal 
          games={allGames} 
          onClose={() => setIsExporterOpen(false)} 
        />
      )}

      {isAddCustomOpen && (
        <CustomPortModal 
          isOpen={isAddCustomOpen}
          onClose={() => setIsAddCustomOpen(false)} 
          onAddCustomGame={handleAddCustomGame} 
          onAddGame={handleAddCustomGame} 
        />
      )}

      {isAboutOpen && (
        <AboutModal 
          isOpen={isAboutOpen} 
          onClose={() => setIsAboutOpen(false)} 
        />
      )}

      {isThemeOpen && (
        <ThemeModal 
          isOpen={isThemeOpen} 
          onClose={() => setIsThemeOpen(false)} 
          currentTheme={theme}
          onSelectTheme={handleSelectTheme}
        />
      )}

      {isCommandPaletteOpen && (
        <CommandPalette
          games={allGames}
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onSelectGame={(game) => {
            if (game.iframeCompatible) {
              handlePlayInDeck(game);
            } else {
              window.open(game.primaryUrl, '_blank', 'noopener,noreferrer');
            }
          }}
          favorites={favorites}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      {isTestLogOpen && (
        <GameTestLogModal
          games={allGames}
          testLogs={testLogs}
          onClose={() => setIsTestLogOpen(false)}
          onClearLogs={() => setTestLogs([])}
        />
      )}

    </div>
  );
}
