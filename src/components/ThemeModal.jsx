import React from 'react';
import { X, Palette, Check, Sparkles, Monitor, Terminal, Flame } from 'lucide-react';
import { playHudClick, playHudBleep } from '../utils/soundEffects';

export const THEMES = [
  {
    id: 'liquid-glass',
    name: 'Liquid Glass (Default)',
    desc: 'Apple visionOS frosted glass, specular highlights, and chromatic fluid refraction',
    badge: 'Trending 2026',
    previewGradient: 'from-indigo-500/20 via-purple-500/20 to-cyan-500/20',
    icon: Sparkles
  },
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    desc: 'High-voltage electric cyan (#00F0FF) & neon violet with glowing circuit rims',
    badge: 'High Voltage',
    previewGradient: 'from-cyan-500/30 via-violet-500/30 to-fuchsia-500/30',
    icon: Flame
  },
  {
    id: 'obsidian-minimal',
    name: 'Obsidian Minimal',
    desc: 'Pure matte stealth black, titanium hairline borders, zero distraction clarity',
    badge: 'Stealth',
    previewGradient: 'from-slate-800 to-slate-950',
    icon: Terminal
  },
  {
    id: 'retro-crt',
    name: 'Retro Arcade CRT',
    desc: 'Phosphor green/amber glow with vintage arcade cabinet scanlines and bevels',
    badge: 'Vintage 1990',
    previewGradient: 'from-emerald-950/40 via-amber-950/30 to-black',
    icon: Monitor
  }
];

export function ThemeModal({ isOpen, onClose, currentTheme, onSelectTheme }) {
  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass-modal rounded-2xl max-w-lg w-full border border-white/[0.16] p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-modalEnter cursor-default"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-inner">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg text-white">Visual Themes</h2>
              <p className="text-xs text-slate-400">Personalize your deck styling, glass textures, and ambient lighting</p>
            </div>
          </div>
          <button 
            onClick={() => { playHudClick(); onClose(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Themes Grid */}
        <div className="space-y-3">
          {THEMES.map((th) => {
            const isSelected = currentTheme === th.id;
            const Icon = th.icon;

            return (
              <div
                key={th.id}
                onClick={() => {
                  playHudBleep();
                  onSelectTheme(th.id);
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                  isSelected 
                    ? 'border-indigo-400 bg-white/[0.08] shadow-lg shadow-indigo-500/10' 
                    : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20'
                }`}
              >
                {/* Background Tint */}
                <div className={`absolute inset-0 bg-gradient-to-r ${th.previewGradient} opacity-30 pointer-events-none`} />

                <div className="relative z-10 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-xl border ${
                      isSelected 
                        ? 'bg-indigo-500 text-white border-indigo-400' 
                        : 'bg-white/[0.06] text-slate-400 border-white/10 group-hover:text-white'
                    } transition-colors`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">{th.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-white/10 text-slate-300 border border-white/10">
                          {th.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {th.desc}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white shrink-0 shadow-md">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
          <span>Theme saves automatically to browser storage</span>
          <button
            onClick={() => { playHudClick(); onClose(); }}
            className="min-btn py-1.5 px-3.5 text-white"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
