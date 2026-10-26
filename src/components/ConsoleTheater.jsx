import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ExternalLink, 
  RotateCcw, 
  Monitor, 
  Tv, 
  Maximize2, 
  Crosshair, 
  Gamepad2, 
  ChevronDown, 
  Play, 
  ArrowUpRight, 
  ShieldCheck, 
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Sparkles
} from 'lucide-react';
import { GameThumbnail } from './GameThumbnail';
import { playHudClick, playLaunchEngine } from '../utils/soundEffects';

export function ConsoleTheater({ 
  game, 
  onClose, 
  telemetry,
  crtFilter,
  setCrtFilter,
  aspectRatio,
  setAspectRatio,
  onLogGameStatus,
  currentTestStatus
}) {
  const [currentUrl, setCurrentUrl] = useState(game?.primaryUrl || "");
  const [iframeKey, setIframeKey] = useState(1);
  const [mirrorDropdownOpen, setMirrorDropdownOpen] = useState(false);
  const [forceIframe, setForceIframe] = useState(false);
  const theaterRef = useRef(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (game) {
      setCurrentUrl(game.primaryUrl);
      setIframeKey(Date.now());
      setForceIframe(false);
      playLaunchEngine();
    }
  }, [game]);

  const handleRequestPointerLock = () => {
    playHudClick();
    if (iframeRef.current) {
      iframeRef.current.focus();
      try {
        if (iframeRef.current.requestPointerLock) {
          iframeRef.current.requestPointerLock();
        }
      } catch (e) {
        console.warn("Pointer lock error:", e);
      }
    }
  };

  const handleHardReload = () => {
    playHudClick();
    setIframeKey(Date.now());
  };

  const handleLaunchStandalone = (url = currentUrl) => {
    playHudClick();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!game) return null;

  // Check if site requires top-level standalone tab to prevent framing block
  const requiresStandalone = !game.iframeCompatible && !forceIframe;

  const aspectClass = 
    aspectRatio === '16-9' ? 'aspect-video max-w-6xl' :
    aspectRatio === '4-3' ? 'aspect-[4/3] max-w-4xl' :
    'w-full h-full max-w-full';

  return (
    <div 
      ref={theaterRef}
      className="fixed inset-0 z-50 flex flex-col bg-[#07090E] text-white animate-fadeIn select-none"
    >
      {/* Top Console Theater Header Bezel */}
      <div className="glass-panel border-b border-white/[0.08] px-4 py-2.5 flex items-center justify-between gap-3 bg-[#0B0E17]/95 z-30">
        
        {/* Left: Back Button & Game Title & Metadata */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => { playHudClick(); onClose(); }}
            className="hud-btn hud-btn-primary py-1.5 px-3 text-xs font-mono font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
            title="Return to WASM Deck Catalog"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">BACK TO DECK</span>
            <span className="sm:hidden">BACK</span>
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2 h-2 rounded-full shrink-0 ${game.iframeCompatible ? 'bg-emerald-400' : 'bg-sky-400'} pulse-dot`} />
            <h2 className="font-display font-semibold text-sm sm:text-base text-white tracking-tight truncate">
              {game.title}
            </h2>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 font-mono text-[11px] text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20 shrink-0">
            <span>{game.engine}</span>
          </div>

          <div className="hidden xl:flex items-center gap-1.5 font-mono text-[11px] text-slate-400 bg-white/[0.03] px-2 py-0.5 rounded shrink-0">
            <span>{game.memoryEst}</span>
          </div>
        </div>

        {/* Console Control Bar */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          
          {/* Quick Verification & Test Logger */}
          {onLogGameStatus && (
            <div className="flex items-center gap-1 bg-white/[0.03] border border-white/[0.08] rounded-md px-1.5 py-0.5">
              <span className="text-[10px] font-mono text-slate-400 px-1 hidden md:inline">Test Status:</span>
              <button
                onClick={() => {
                  playHudClick();
                  onLogGameStatus(game, 'working');
                }}
                className={`px-2 py-1 rounded text-xs font-mono flex items-center gap-1 transition-all cursor-pointer ${
                  currentTestStatus === 'working' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold shadow-sm' 
                    : 'text-slate-400 hover:text-emerald-400'
                }`}
                title="Mark game as working & append to test log"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Working</span>
              </button>
              <button
                onClick={() => {
                  playHudClick();
                  onLogGameStatus(game, 'broken');
                }}
                className={`px-2 py-1 rounded text-xs font-mono flex items-center gap-1 transition-all cursor-pointer ${
                  currentTestStatus === 'broken' 
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold shadow-sm' 
                    : 'text-slate-400 hover:text-rose-400'
                }`}
                title="Mark game as broken & append to test log"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Not Working</span>
              </button>
            </div>
          )}
          
          {/* Mirror Switcher */}
          {game.mirrors && game.mirrors.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setMirrorDropdownOpen(!mirrorDropdownOpen)}
                className="hud-btn text-xs py-1 px-2.5 text-indigo-300 border-indigo-500/30"
              >
                <span>Mirrors ({game.mirrors.length + 1})</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {mirrorDropdownOpen && (
                <div className="absolute right-0 mt-1 w-64 bg-[#111420] border border-white/[0.1] rounded-lg shadow-2xl p-1.5 z-40 animate-modalEnter">
                  <div className="text-[10px] font-mono text-slate-400 px-2 py-1 uppercase tracking-wider">
                    Select Game Mirror:
                  </div>
                  <button
                    onClick={() => {
                      setCurrentUrl(game.primaryUrl);
                      setIframeKey(Date.now());
                      setMirrorDropdownOpen(false);
                      playHudClick();
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-mono transition-colors flex items-center justify-between ${
                      currentUrl === game.primaryUrl ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span>Primary Game URL</span>
                    {currentUrl === game.primaryUrl && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                  {game.mirrors.map((m, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentUrl(m.url);
                        setIframeKey(Date.now());
                        setMirrorDropdownOpen(false);
                        playHudClick();
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-mono transition-colors flex items-center justify-between ${
                        currentUrl === m.url ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-300 hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className="truncate">{m.label}</span>
                      {currentUrl === m.url && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Aspect Ratio Switcher */}
          {!requiresStandalone && (
            <div className="flex items-center bg-white/[0.03] border border-white/[0.08] rounded-md p-0.5">
              <button
                onClick={() => { playHudClick(); setAspectRatio('16-9'); }}
                className={`px-2 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer ${
                  aspectRatio === '16-9' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="16:9 Widescreen"
              >
                <Monitor className="w-3 h-3" />
                <span>16:9</span>
              </button>
              <button
                onClick={() => { playHudClick(); setAspectRatio('4-3'); }}
                className={`px-2 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer ${
                  aspectRatio === '4-3' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="4:3 Classic"
              >
                <Tv className="w-3 h-3" />
                <span>4:3</span>
              </button>
              <button
                onClick={() => { playHudClick(); setAspectRatio('fill'); }}
                className={`px-2 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1 cursor-pointer ${
                  aspectRatio === 'fill' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Fill Screen"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Fill</span>
              </button>
            </div>
          )}

          {!requiresStandalone && (
            <button
              onClick={handleRequestPointerLock}
              className="hud-btn text-xs py-1 px-2.5 text-slate-300 hover:text-white"
              title="Focus canvas & lock pointer"
            >
              <Crosshair className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">Focus Canvas</span>
            </button>
          )}

          {/* Hard Reload Binary */}
          <button
            onClick={handleHardReload}
            className="hud-btn text-xs py-1 px-2 text-slate-400 hover:text-white"
            title="Reload game binary"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Standalone Tab Launch */}
          <button
            onClick={() => handleLaunchStandalone()}
            className="hud-btn hud-btn-cyan text-xs py-1 px-2.5"
            title="Launch directly in standalone browser window"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Launch Window</span>
          </button>

          {/* Close Theater */}
          <button
            onClick={() => { playHudClick(); onClose(); }}
            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors ml-1 cursor-pointer"
            title="Exit Theater"
          >
            <X className="w-5 h-5" />
          </button>

        </div>

      </div>

      {/* Main Viewport Container */}
      <div className="flex-1 relative flex items-center justify-center p-3 md:p-6 overflow-hidden bg-[#06080E]">
        
        {/* Chassis Framing */}
        <div className={`relative w-full h-full flex items-center justify-center rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl bg-black ${aspectClass}`}>
          
          {/* STANDALONE LAUNCH VIEWPORT */}
          {requiresStandalone ? (
            <div className="w-full h-full relative flex flex-col items-center justify-center p-6 text-center overflow-hidden bg-gradient-to-b from-[#111422] via-[#0A0D16] to-[#06080E]">
              
              {/* Blurred Cover Art Atmosphere */}
              {game.thumbnailUrl && (
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-10 blur-3xl scale-110 pointer-events-none"
                  style={{ backgroundImage: `url(${game.thumbnailUrl})` }}
                />
              )}

              <div className="relative z-10 max-w-lg w-full flex flex-col items-center">
                
                {/* Artwork Card */}
                <div className="w-56 h-32 rounded-xl overflow-hidden border border-white/[0.12] shadow-2xl mb-5 bg-[#0D1018]">
                  <GameThumbnail
                    src={game.thumbnailUrl}
                    title={game.title}
                    category={game.category}
                    aspect="w-full h-full"
                  />
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono text-xs font-medium mb-3">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>DIRECT ENGINE LAUNCHER</span>
                </div>

                <h2 className="font-display font-bold text-2xl md:text-3xl text-white tracking-tight mb-2">
                  {game.title}
                </h2>

                <p className="text-xs text-slate-300 max-w-md leading-relaxed mb-6 font-sans">
                  This game runs directly in your browser with full client-side WebAssembly, WebGL2, and AudioWorklet. To guarantee 60 FPS performance and prevent iframe restriction errors, launch directly into its dedicated window.
                </p>

                {/* Big Primary Launch Button */}
                <button
                  onClick={() => handleLaunchStandalone()}
                  className="w-full max-w-sm py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-sans font-semibold text-sm tracking-wide shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mb-2.5"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>PLAY NOW IN DEDICATED WINDOW</span>
                  <ArrowUpRight className="w-4 h-4 ml-0.5" />
                </button>

                {/* Back to Catalog Button */}
                <button
                  onClick={() => { playHudClick(); onClose(); }}
                  className="w-full max-w-sm py-2.5 px-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-xs font-mono text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-2 cursor-pointer mb-2"
                >
                  <ArrowLeft className="w-4 h-4 text-indigo-400" />
                  <span>Back to Game Deck Catalog</span>
                </button>

                {/* Mirrors List */}
                {game.mirrors && game.mirrors.length > 0 && (
                  <div className="mt-4 w-full pt-4 border-t border-white/[0.06] text-left">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
                      Alternative Playable Mirrors:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {game.mirrors.map((m, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleLaunchStandalone(m.url)}
                          className="px-2.5 py-1 rounded bg-white/[0.03] border border-white/[0.08] hover:border-indigo-400/40 text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>{m.label}</span>
                          <ArrowUpRight className="w-3 h-3 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>
          ) : (
            /* IFRAME: Direct In-Browser Playable Viewport */
            <iframe
              key={iframeKey}
              ref={iframeRef}
              src={currentUrl}
              title={game.title}
              className="w-full h-full border-0 bg-black"
              allow="autoplay; fullscreen; gamepad; pointer-lock; cross-origin-isolated; clipboard-read; clipboard-write"
              loading="eager"
            />
          )}

        </div>

      </div>

      {/* Bottom Telemetry Bar */}
      <div className="glass-panel border-t border-white/[0.06] px-4 py-1.5 flex items-center justify-between text-[11px] font-mono text-slate-400 bg-[#0A0D15] z-30">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            Delivery: <strong className="text-white">{game.delivery}</strong>
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline">Memory: <strong className="text-white">{game.memoryEst}</strong></span>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden md:inline">Multiplayer: <strong className="text-white">{game.multiplayer ? 'Supported' : 'Solo'}</strong></span>
        </div>

        <div className="flex items-center gap-2">
          <span>Target: <strong className="text-emerald-400">Native WASM Game</strong></span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 truncate max-w-xs">
            {(() => {
              try { return new URL(currentUrl).hostname; } catch { return 'Direct WASM'; }
            })()}
          </span>
        </div>
      </div>

    </div>
  );
}
