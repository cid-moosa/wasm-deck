import React, { useState, useMemo } from 'react';
import { 
  X, 
  PlusCircle, 
  Globe, 
  Cpu, 
  HardDrive, 
  Sparkles, 
  Image, 
  Send, 
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { playHudClick, playHudBleep } from '../utils/soundEffects';

function GithubIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

export function CustomPortModal({ isOpen = true, onClose, onAddCustomGame, onAddGame }) {
  const addGame = onAddCustomGame || onAddGame;
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

  if (isOpen === false) return null;

  const validateUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const computedGitHubUrl = useMemo(() => {
    if (!primaryUrl.trim()) {
      return "https://github.com/cid-moosa/wasm-deck/issues/new?template=game_proposal.md";
    }
    const gameTitle = title.trim() || "New WebAssembly Port";
    const issueTitle = `[Game Proposal]: ${gameTitle}`;
    const issueBody = `### 🎮 WebAssembly Game Proposal

- **Game Title**: ${gameTitle}
- **Playable WASM URL**: ${primaryUrl.trim()}
- **Category / Platform**: ${category}
- **Engine / Architecture**: ${engine.trim() || 'Custom WebAssembly'}
- **Estimated Memory**: ${memoryEst.trim() || '150 MB'}
- **Multiplayer**: ${multiplayer ? 'Yes' : 'No'}
- **Playable inside Iframe**: ${iframeCompatible ? 'Yes' : 'No'}
- **Cover / Thumbnail URL**: ${thumbnailUrl.trim() || 'N/A'}
- **Alternative Mirrors**:
${mirrorsText.trim() || 'None provided'}

**Technical Notes / Details**:
${notes.trim() || 'Proposed via WASM//DECK community submit portal.'}

---
*Submitted from https://cid-moosa.github.io/wasm-deck/*`;

    return `https://github.com/cid-moosa/wasm-deck/issues/new?title=${encodeURIComponent(issueTitle)}&body=${encodeURIComponent(issueBody)}`;
  }, [title, primaryUrl, category, engine, memoryEst, multiplayer, iframeCompatible, thumbnailUrl, mirrorsText, notes]);

  const handleSaveLocally = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a title for the WebAssembly port.");
      return;
    }
    if (!primaryUrl.trim() || !validateUrl(primaryUrl.trim())) {
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
    if (addGame) addGame(newGame);
    onClose();
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="liquid-glass-modal rounded-2xl max-w-xl w-full border border-white/[0.16] p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-modalEnter cursor-default"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-inner">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg text-white">Submit Game to Catalog</h2>
              <p className="text-xs text-slate-400">Propose a new game URL to GitHub or test in browser</p>
            </div>
          </div>
          <button 
            onClick={() => { playHudClick(); onClose(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Community Info Banner with Direct GitHub Link */}
        <a 
          href="https://github.com/cid-moosa/wasm-deck/issues/new?template=game_proposal.md"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-5 p-3.5 rounded-xl bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent border border-indigo-500/25 flex items-start gap-3 hover:border-indigo-400/40 transition-colors cursor-pointer group"
        >
          <GithubIcon className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
          <div className="text-xs">
            <div className="font-semibold text-indigo-200 mb-0.5 flex items-center gap-1.5">
              <span>Have a WebAssembly game to add?</span>
              <ExternalLink className="w-3 h-3 text-indigo-400 opacity-70" />
            </div>
            <p className="text-slate-400 leading-relaxed">
              Anyone can propose new game URLs directly to the maintainer on GitHub. Enter the game details below and click <strong className="text-white">Submit to GitHub</strong>!
            </p>
          </div>
        </a>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSaveLocally} className="space-y-4 text-xs">
          
          {/* Title */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Game / Port Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sonic Mania Web, Portal Flash Edition, Godot 4 Web Demo"
              className="w-full bg-[#10131C]/90 border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50 transition-all"
            />
          </div>

          {/* Primary URL */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Playable WASM Game URL</label>
            <input
              type="url"
              value={primaryUrl}
              onChange={(e) => setPrimaryUrl(e.target.value)}
              placeholder="https://... or http://localhost:8080/index.html"
              className="w-full bg-[#10131C]/90 border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50 transition-all"
            />
          </div>

          {/* Category & Engine */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#10131C] border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-400 transition-all"
              >
                <option value="aaa-console">AAA & Console Port</option>
                <option value="nintendo-decomp">Nintendo Decompilation</option>
                <option value="classic-pc">Classic PC Port</option>
                <option value="modern-indie">Modern Indie Web Game</option>
                <option value="retro-arcade">Retro Arcade (FBNeo)</option>
                <option value="flash-classics">Flash Classic (Ruffle)</option>
                <option value="hubs">Master Game Hub</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Engine / Runtime</label>
              <input
                type="text"
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                placeholder="e.g. Unity WebGL, Godot 4, Emscripten C++"
                className="w-full bg-[#10131C]/90 border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-all"
              />
            </div>
          </div>

          {/* Thumbnail / Cover Art URL */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5 text-indigo-400" />
              <span>Cover Art / Thumbnail URL (Optional)</span>
            </label>
            <input
              type="url"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://... Steam header or screenshot URL"
              className="w-full bg-[#10131C]/90 border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-400 transition-all"
            />
          </div>

          {/* Checkboxes: Iframe Compatibility & Multiplayer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex items-center gap-2.5 p-3 bg-white/[0.03] border border-white/[0.08] rounded-xl cursor-pointer hover:bg-white/[0.06] transition-all">
              <input
                type="checkbox"
                checked={iframeCompatible}
                onChange={(e) => setIframeCompatible(e.target.checked)}
                className="rounded bg-black border-white/20 text-indigo-500 focus:ring-0"
              />
              <span className="text-slate-300">Embeddable in Viewport (Iframe)</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 bg-white/[0.03] border border-white/[0.08] rounded-xl cursor-pointer hover:bg-white/[0.06] transition-all">
              <input
                type="checkbox"
                checked={multiplayer}
                onChange={(e) => setMultiplayer(e.target.checked)}
                className="rounded bg-black border-white/20 text-indigo-500 focus:ring-0"
              />
              <span className="text-slate-300">Multiplayer / Online Lobby</span>
            </label>
          </div>

          {/* Technical Notes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Notes / Playability Details</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Requires gamepad, runs at 60 FPS on Chrome with WebGPU enabled."
              rows={2}
              className="w-full bg-[#10131C]/90 border border-white/[0.1] rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 transition-all"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/[0.08]">
            {/* Direct reliable Anchor tag for GitHub submission - impervious to popup blockers */}
            <a
              href={computedGitHubUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { playHudBleep(); }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              title="Open GitHub Issue to submit this game URL to maintainer"
            >
              <GithubIcon className="w-4 h-4" />
              <span>Submit to Creator on GitHub</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-70" />
            </a>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => { playHudClick(); onClose(); }}
                className="py-2.5 px-3.5 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2.5 px-4 rounded-xl bg-white/[0.1] hover:bg-white/[0.18] border border-white/20 text-white font-medium transition-all cursor-pointer"
              >
                Save Locally (Test)
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
