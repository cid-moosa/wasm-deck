import React, { useState } from 'react';
import { X, PlusCircle, Globe, Cpu, HardDrive, Check, Sparkles, Image } from 'lucide-react';
import { playHudClick, playHudBleep } from '../utils/soundEffects';

export function CustomPortModal({ isOpen, onClose, onAddCustomGame }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("modern-indie");
  const [engine, setEngine] = useState("Custom Emscripten WASM");
  const [primaryUrl, setPrimaryUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [delivery, setDelivery] = useState("Instant Stream");
  const [memoryEst, setMemoryEst] = useState("150 MB");
  const [iframeCompatible, setIframeCompatible] = useState(true);
  const [multiplayer, setMultiplayer] = useState(false);
  const [notes, setNotes] = useState("");
  const [mirrorsText, setMirrorsText] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a title for the WebAssembly port.");
      return;
    }
    if (!primaryUrl.trim()) {
      setError("Please provide a valid URL.");
      return;
    }

    try {
      new URL(primaryUrl);
    } catch {
      setError("Invalid URL format. Please include http:// or https://");
      return;
    }

    // Parse mirrors
    const mirrors = mirrorsText
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map((url, idx) => ({
        label: `Mirror #${idx + 1}`,
        url
      }));

    const newGame = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      category,
      engine: engine.trim(),
      delivery,
      memoryEst: memoryEst.trim() || "150 MB",
      multiplayer,
      iframeCompatible,
      thumbnailUrl: thumbnailUrl.trim() || null,
      primaryUrl: primaryUrl.trim(),
      mirrors,
      notes: notes.trim() || "User-injected custom WebAssembly port.",
      custom: true,
      addedAt: Date.now()
    };

    playHudBleep();
    onAddCustomGame(newGame);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel-heavy rounded-2xl max-w-xl w-full border border-white/[0.1] p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-modalEnter">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg text-white">Inject Custom WASM Port</h2>
              <p className="text-xs text-slate-400">Add localhost, Cloudflare Worker, or GitHub Page port</p>
            </div>
          </div>
          <button 
            onClick={() => { playHudClick(); onClose(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E2436] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Title */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Game / Port Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Quake 3 Local Build, Sonic 3 A.I.R., Godot 4 Demo"
              className="w-full bg-[#10131C] border border-[#1E2436] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0FF]"
              required
            />
          </div>

          {/* Primary URL */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Playable WASM URL *</label>
            <input
              type="url"
              value={primaryUrl}
              onChange={(e) => setPrimaryUrl(e.target.value)}
              placeholder="https://... or http://localhost:8080/index.html"
              className="w-full bg-[#10131C] border border-[#1E2436] rounded-lg px-3 py-2 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-[#00F0FF]"
              required
            />
          </div>

          {/* Thumbnail / Cover Art URL */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span>Cover Art / Thumbnail URL (Optional)</span>
            </label>
            <input
              type="url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://... image URL (auto-generates industrial monogram if blank)"
              className="w-full bg-[#10131C] border border-[#1E2436] rounded-lg px-3 py-2 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-[#00F0FF]"
            />
          </div>

          {/* Category & Delivery Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#10131C] border border-[#1E2436] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00F0FF]"
              >
                <option value="aaa-console">AAA & Console Ports</option>
                <option value="nintendo-decomp">Nintendo & Decomps</option>
                <option value="classic-pc">Classic PC FPS / RTS / RPG</option>
                <option value="modern-indie">Modern Indie & Sandbox</option>
                <option value="github-repos">Self-Host Repos</option>
                <option value="hubs">Master Directory & Hub</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Delivery Mode</label>
              <select
                value={delivery}
                onChange={(e) => setDelivery(e.target.value)}
                className="w-full bg-[#10131C] border border-[#1E2436] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#00F0FF]"
              >
                <option value="Instant Stream">Instant Stream (CDN/R2)</option>
                <option value="BYO-ROM">BYO-ROM (User ROM Required)</option>
                <option value="GitHub Source">GitHub Source (Self-Host)</option>
              </select>
            </div>
          </div>

          {/* Engine & Memory Estimate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Engine / Runtime Tag</label>
              <input
                type="text"
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                placeholder="e.g. Godot 4 / WASM, Xash3D, Emscripten C++"
                className="w-full bg-[#10131C] border border-[#1E2436] rounded-lg px-3 py-2 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-[#00F0FF]"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Memory Allocation Estimate</label>
              <input
                type="text"
                value={memoryEst}
                onChange={(e) => setMemoryEst(e.target.value)}
                placeholder="e.g. 250 MB, 1.2 GB OPFS"
                className="w-full bg-[#10131C] border border-[#1E2436] rounded-lg px-3 py-2 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-[#00F0FF]"
              />
            </div>
          </div>

          {/* Checkboxes: Iframe Compatibility & Multiplayer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <label className="flex items-center gap-2 p-3 bg-[#10131C] border border-[#1E2436] rounded-lg cursor-pointer hover:border-[#38BDF8]/50">
              <input
                type="checkbox"
                checked={iframeCompatible}
                onChange={(e) => setIframeCompatible(e.target.checked)}
                className="rounded bg-[#08090E] border-[#1E2436] text-[#654FF0] focus:ring-0"
              />
              <span className="text-slate-300">Playable inside Deck Viewport (Iframe)</span>
            </label>

            <label className="flex items-center gap-2 p-3 bg-[#10131C] border border-[#1E2436] rounded-lg cursor-pointer hover:border-[#38BDF8]/50">
              <input
                type="checkbox"
                checked={multiplayer}
                onChange={(e) => setMultiplayer(e.target.checked)}
                className="rounded bg-[#08090E] border-[#1E2436] text-[#654FF0] focus:ring-0"
              />
              <span className="text-slate-300">Multiplayer / Lobby Support</span>
            </label>
          </div>

          {/* Technical Notes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Technical Notes / Architecture Details</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Compiled using Emscripten 3.1.50 with WebGL 2.0 backend."
              rows={2}
              className="w-full bg-[#10131C] border border-[#1E2436] rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-[#00F0FF]"
            />
          </div>

          {/* Optional Mirrors */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Alternative Mirrors (1 URL per line, optional)</label>
            <textarea
              value={mirrorsText}
              onChange={(e) => setMirrorsText(e.target.value)}
              placeholder="https://mirror1.pages.dev/&#10;https://mirror2.worker.dev/"
              rows={2}
              className="w-full bg-[#10131C] border border-[#1E2436] rounded-lg px-3 py-2 text-white placeholder-slate-500 font-mono text-[11px] focus:outline-none focus:border-[#00F0FF]"
            />
          </div>

          {/* Submit and Cancel Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E2436]">
            <button
              type="button"
              onClick={() => { playHudClick(); onClose(); }}
              className="hud-btn text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="hud-btn hud-btn-primary text-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Save & Add to Deck</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
