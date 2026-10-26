import React from 'react';
import { 
  Search, 
  Plus, 
  Volume2, 
  VolumeX, 
  ClipboardList, 
  HardDrive,
  Cpu
} from 'lucide-react';
import { playHudClick, setAudioMuted } from '../utils/soundEffects';

export function HeaderHUD({
  telemetry,
  onOpenStorageGuide,
  onOpenExporter,
  onOpenAddCustom,
  onOpenCommandPalette,
  onOpenTestLogs,
  testLogCount = 0,
  audioMuted,
  setAudioMutedState
}) {
  const toggleAudio = () => {
    const next = !audioMuted;
    setAudioMutedState(next);
    setAudioMuted(next);
    if (!next) playHudClick();
  };

  return (
    <header className="sticky top-0 z-40 px-4 sm:px-6 py-3 bg-[#090A0F]/90 backdrop-blur-md border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Left: Minimalist Brand Wordmark */}
        <div className="flex items-center gap-3">
          <div 
            className="flex items-center gap-2 cursor-pointer group" 
            onClick={onOpenCommandPalette}
          >
            <div className="w-7 h-7 rounded-md bg-white text-black font-mono font-bold text-xs flex items-center justify-center transition-transform group-hover:scale-105">
              W
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-white">
                WASM
              </span>
              <span className="text-slate-500 font-mono text-xs">/</span>
              <span className="text-slate-400 font-mono text-xs tracking-wider">
                DECK
              </span>
            </div>
          </div>

          {/* Minimalist System Status Pill */}
          <div className="hidden md:flex items-center gap-2 pl-3 border-l border-white/[0.08] text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${telemetry.webgpuAvailable ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              {telemetry.webgpuAvailable ? 'WebGPU' : 'WebGL2'}
            </span>
            <span className="text-slate-600">•</span>
            <span>{telemetry.deviceMemoryGB}GB RAM</span>
          </div>
        </div>

        {/* Right: Clean Minimalist Actions */}
        <div className="flex items-center gap-2">
          
          {/* Quick Search Trigger */}
          <button
            onClick={() => { playHudClick(); onOpenCommandPalette(); }}
            className="min-btn py-1.5 px-3 text-slate-300 hover:text-white"
            title="Search games (Ctrl + K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline text-[10px] font-mono bg-white/[0.08] px-1.5 py-0.5 rounded text-slate-400 ml-1">
              ⌘K
            </kbd>
          </button>

          {/* Add Port */}
          <button
            onClick={() => { playHudClick(); onOpenAddCustom(); }}
            className="min-btn py-1.5 px-3 text-slate-300 hover:text-white"
            title="Add custom WebAssembly game URL"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Game</span>
          </button>

          {/* Verification Logs */}
          <button
            onClick={() => { playHudClick(); onOpenTestLogs(); }}
            className="min-btn py-1.5 px-2.5 text-slate-300 hover:text-white"
            title="View verification logs"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            {testLogCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/10 text-white font-medium">
                {testLogCount}
              </span>
            )}
          </button>

          {/* Storage Guide */}
          <button
            onClick={() => { playHudClick(); onOpenStorageGuide(); }}
            className="min-btn py-1.5 px-2.5 text-slate-400 hover:text-white hidden md:inline-flex"
            title="Inspect OPFS storage cache"
          >
            <HardDrive className="w-3.5 h-3.5" />
          </button>

          {/* Audio Mute Toggle */}
          <button
            onClick={toggleAudio}
            className="min-btn py-1.5 px-2.5 text-slate-400 hover:text-white"
            title={audioMuted ? "Unmute audio" : "Mute audio"}
          >
            {audioMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-slate-300" />
            )}
          </button>

        </div>

      </div>
    </header>
  );
}
