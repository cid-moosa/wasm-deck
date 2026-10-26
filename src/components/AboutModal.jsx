import React from 'react';
import { 
  X, 
  Info, 
  Cpu, 
  ShieldCheck, 
  Sparkles, 
  Gamepad2, 
  ExternalLink,
  Code2,
  Zap,
  Globe
} from 'lucide-react';
import { playHudClick } from '../utils/soundEffects';

function GithubIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

export function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass-modal rounded-2xl max-w-2xl w-full border border-white/[0.16] p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-modalEnter cursor-default"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-black font-mono font-bold text-base flex items-center justify-center shadow-lg">
              W
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-lg text-white">WASM//DECK</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                  v2.5 Liquid
                </span>
              </div>
              <p className="text-xs text-slate-400">Zero-Cloud Native WebAssembly Game Engine Runtime</p>
            </div>
          </div>
          <button 
            onClick={() => { playHudClick(); onClose(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-5 text-xs text-slate-300 leading-relaxed">
          
          {/* Mission statement */}
          <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] shadow-inner">
            <p className="text-slate-200">
              <strong className="text-white font-semibold">WASM//DECK</strong> is a high-craft, client-side WebAssembly game launcher that preserves and executes over <strong className="text-indigo-300">560+ verified native game ports</strong>, console decompilations, and homebrew engines directly inside modern browser sandboxes.
            </p>
            <p className="mt-2 text-slate-400">
              Zero cloud streaming, zero video latency, zero downloads, and zero external plugins — 100% computed on your local device CPU & GPU.
            </p>
          </div>

          {/* Pillars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-indigo-400 font-semibold mb-1">
                <Cpu className="w-4 h-4" />
                <span>WebAssembly & WebGPU</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Runs native C/C++, Rust, and Zig game source codes compiled with Emscripten into sandboxed WASM binaries with SIMD acceleration.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>100% Client Isolation</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Zero trackers, zero analytics, zero cookies. Storage operates exclusively on Origin Private File System (OPFS) and local browser memory.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
                <Gamepad2 className="w-4 h-4" />
                <span>Standard Gamepad API</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Plug and play support for PlayStation, Xbox, Switch Pro, and Bluetooth controllers with automatic button mapping.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-1">
                <Sparkles className="w-4 h-4" />
                <span>3D Spatial Studio Hero</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Real-time Three.js WebGL physical cartridge showroom with dynamic PBR lighting, mouse gyro-tilt physics, and live cover mapping.
              </p>
            </div>
          </div>

          {/* Catalog Breakdown */}
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              <span>Catalog Breakdown (563 Verified Ports)</span>
            </h3>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-400 font-mono">
              <li>• 14 AAA & Console Ports</li>
              <li>• 6 Nintendo Decomps</li>
              <li>• 15 Classic PC Ports</li>
              <li>• 6 Modern Indie Classics</li>
              <li>• 227 Retro Arcade (FBNeo)</li>
              <li>• 286 Flash Hits (Ruffle)</li>
            </ul>
          </div>

          {/* Creator & Open Source Links */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/[0.08]">
            <div className="text-slate-400 text-[11px]">
              Crafted by <a href="https://github.com/cid-moosa" target="_blank" rel="noopener noreferrer" className="text-white hover:text-indigo-300 font-medium transition-colors">@cid-moosa</a>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="https://github.com/cid-moosa/wasm-deck"
                target="_blank"
                rel="noopener noreferrer"
                className="min-btn py-1.5 px-3 bg-white/[0.08] hover:bg-white/[0.15] text-white border-white/20"
              >
                <GithubIcon className="w-3.5 h-3.5" />
                <span>GitHub Repository</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
