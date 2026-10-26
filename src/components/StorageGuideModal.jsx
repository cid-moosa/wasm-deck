import React, { useState } from 'react';
import { X, HardDrive, ShieldCheck, Database, Check, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import { requestPersistentStorage } from '../services/hardwareTelemetry';
import { playHudClick, playHudBleep } from '../utils/soundEffects';

export function StorageGuideModal({ isOpen, onClose, telemetry, onRefreshTelemetry }) {
  const [persisted, setPersisted] = useState(null);
  const [clearing, setClearing] = useState(false);

  if (!isOpen) return null;

  const handleRequestPersist = async () => {
    playHudClick();
    const result = await requestPersistentStorage();
    setPersisted(result);
    if (result) {
      playHudBleep();
    }
    if (onRefreshTelemetry) onRefreshTelemetry();
  };

  const handleClearCache = async () => {
    playHudClick();
    if (window.confirm("Clear browser cache for WASM Deck? This will reset downloaded temporary game chunks.")) {
      setClearing(true);
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(key => caches.delete(key)));
        }
        if (onRefreshTelemetry) await onRefreshTelemetry();
        playHudBleep();
        alert("Cache cleared successfully.");
      } catch (e) {
        alert("Cache clear error: " + e.message);
      } finally {
        setClearing(false);
      }
    }
  };

  const estimate = telemetry.storageEstimate || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel-heavy rounded-2xl max-w-2xl w-full border border-white/[0.1] p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-modalEnter">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg text-white">Browser Storage & OPFS Guide</h2>
              <p className="text-xs text-slate-400">Zero-Cloud Native Asset Streaming Architecture</p>
            </div>
          </div>
          <button 
            onClick={() => { playHudClick(); onClose(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E2436] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Storage Meter */}
        <div className="bg-[#10131C] border border-[#1E2436] rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-slate-400">Client Cache Utilization:</span>
            <span className="text-[#00F0FF] font-bold">
              {estimate.usageFormatted || '0 MB'} used of {estimate.quotaFormatted || 'Allocated Quota'}
            </span>
          </div>
          
          <div className="w-full bg-[#08090E] h-2.5 rounded-full overflow-hidden border border-[#1E2436]">
            <div 
              className="bg-gradient-to-r from-[#654FF0] to-[#00F0FF] h-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(1, parseFloat(estimate.percentUsed) || 2))}%` }}
            />
          </div>
          
          <div className="flex justify-between items-center mt-3 text-[11px] text-slate-500 font-mono">
            <span>Disk Eviction Threshold: ~80% host capacity</span>
            <span>Allocated Quota: {estimate.quotaFormatted}</span>
          </div>
        </div>

        {/* 3 Pillars of Client-Side Web Storage */}
        <div className="space-y-4 mb-6 text-xs text-slate-300">
          
          <div className="flex gap-3 p-3 rounded-lg bg-[#08090E] border border-[#1E2436]">
            <Database className="w-5 h-5 text-[#654FF0] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-white mb-1">1. Origin Private File System (OPFS)</h4>
              <p className="leading-relaxed text-slate-400">
                Large decompilations like <strong className="text-white">Halo CE (2.0 GB)</strong> and <strong className="text-white">GTA reVC (600 MB)</strong> mount a virtual POSIX-compliant filesystem inside Chromium's OPFS. This allows direct byte-range file reads (`read()`, `lseek()`) at near-native NVMe speeds without loading the entire multi-gigabyte game into system RAM.
              </p>
            </div>
          </div>

          <div className="flex gap-3 p-3 rounded-lg bg-[#08090E] border border-[#1E2436]">
            <Zap className="w-5 h-5 text-[#00F0FF] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-white mb-1">2. On-Demand R2 Chunked Streaming</h4>
              <p className="leading-relaxed text-slate-400">
                Ports like <strong className="text-white">Simpsons Hit & Run</strong> break game archives into 1MB chunks hosted on Cloudflare R2 edge servers. The browser Emscripten runtime fetches audio and map chunks only when your in-game vehicle enters a new zone, streaming them into the browser's CacheStorage.
              </p>
            </div>
          </div>

          <div className="flex gap-3 p-3 rounded-lg bg-[#08090E] border border-[#1E2436]">
            <ShieldCheck className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-white mb-1">3. Persistent Storage Grant</h4>
              <p className="leading-relaxed text-slate-400">
                Browsers classify storage as "Best Effort" by default. If your machine runs low on disk space, the browser may evict your savegames and cached game packages. Requesting Persistent Storage protects your files from automated eviction.
              </p>
            </div>
          </div>

        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#1E2436]">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRequestPersist}
              className="hud-btn hud-btn-primary text-xs"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Request Persistent Storage</span>
            </button>
            {persisted !== null && (
              <span className={`text-xs font-mono font-bold flex items-center gap-1 ${persisted ? 'text-emerald-400' : 'text-amber-400'}`}>
                {persisted ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {persisted ? 'Persistent Storage Granted!' : 'Storage Permission Denied'}
              </span>
            )}
          </div>

          <button
            onClick={handleClearCache}
            disabled={clearing}
            className="hud-btn text-xs text-rose-400 hover:text-rose-300 hover:border-rose-500/40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${clearing ? 'animate-spin' : ''}`} />
            <span>Clear Temporary Cache</span>
          </button>
        </div>

      </div>
    </div>
  );
}
