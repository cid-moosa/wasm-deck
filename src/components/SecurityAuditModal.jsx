import React from 'react';
import { X, ShieldAlert, ShieldCheck, AlertOctagon, Terminal, Check, Info, Lock } from 'lucide-react';
import { QUARANTINED_DOMAINS } from '../data/gamesData';
import { playHudClick } from '../utils/soundEffects';

export function SecurityAuditModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel-heavy rounded-2xl max-w-3xl w-full border border-white/[0.1] p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto animate-modalEnter">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg text-white">Security & Sandbox Audit Log</h2>
              <p className="text-xs text-slate-400">Client-Side Isolation, Scam Domain Quarantines & Verification Bar</p>
            </div>
          </div>
          <button 
            onClick={() => { playHudClick(); onClose(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E2436] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* The 3 Golden Rules of Browser WASM Safety */}
        <div className="mb-6">
          <h3 className="font-display font-semibold text-sm text-white mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#00F0FF]" />
            <span>The 3 Rules of Native WebAssembly Safety</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            
            <div className="p-3.5 rounded-lg bg-[#10131C] border border-rose-500/30">
              <div className="flex items-center gap-1.5 text-rose-400 font-bold mb-1.5">
                <AlertOctagon className="w-4 h-4" />
                <span>1. Never Run .EXE Files</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Legitimate WebAssembly games run 100% inside your browser canvas. If a site prompts you to download an installer, `.exe`, or extension to "speed up loading", it is malware.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-[#10131C] border border-[#10B981]/30">
              <div className="flex items-center gap-1.5 text-[#10B981] font-bold mb-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>2. Sandboxed Memory</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                WASM executes in a capability-secured linear memory buffer (`WebAssembly.Memory`). It cannot access your local drives, credentials, or registry unless granted explicit file-picker permissions.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-[#10131C] border border-[#00F0FF]/30">
              <div className="flex items-center gap-1.5 text-[#00F0FF] font-bold mb-1.5">
                <Terminal className="w-4 h-4" />
                <span>3. Inspect DevTools</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Press <code className="bg-black/50 px-1 py-0.5 rounded font-mono text-cyan-300">F12 &rarr; Network</code>. Authentic ports display binary downloads with MIME types <code className="font-mono text-cyan-300">application/wasm</code> and <code className="font-mono text-cyan-300">.data</code> packages.
              </p>
            </div>

          </div>
        </div>

        {/* Quarantined Scam Domains Log */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-semibold text-sm text-white flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              <span>Quarantined Fake & Malicious Domains (Filtered from Catalog)</span>
            </h3>
            <span className="text-[11px] font-mono text-rose-400">
              {QUARANTINED_DOMAINS.length} Quarantined
            </span>
          </div>

          <div className="border border-[#1E2436] rounded-lg overflow-hidden bg-[#0A0C14]">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#10131C] text-slate-400 border-b border-[#1E2436]">
                <tr>
                  <th className="py-2 px-3">Quarantined Domain</th>
                  <th className="py-2 px-3">Threat Classification</th>
                  <th className="py-2 px-3">Date Filtered</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2436]/40 text-slate-300">
                {QUARANTINED_DOMAINS.map((q, idx) => (
                  <tr key={idx} className="hover:bg-rose-950/20">
                    <td className="py-2 px-3 font-semibold text-rose-300 line-through">
                      {q.domain}
                    </td>
                    <td className="py-2 px-3 text-slate-400 text-[11px]">
                      {q.threat}
                    </td>
                    <td className="py-2 px-3 text-slate-500 text-[11px]">
                      {q.date}
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        {q.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Interactive DevTools Network Verification Snippet */}
        <div className="bg-[#08090E] border border-[#1E2436] rounded-lg p-3.5 text-xs">
          <div className="flex items-center justify-between text-slate-400 font-mono text-[11px] mb-2 pb-2 border-b border-[#1E2436]">
            <span>Expected Emscripten / WebAssembly Network Headers:</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Authentic Port Signature
            </span>
          </div>
          <pre className="text-[11px] font-mono text-cyan-300/90 leading-relaxed overflow-x-auto">
{`HTTP/2 200 OK
content-type: application/wasm
cross-origin-opener-policy: same-origin
cross-origin-embedder-policy: require-corp
access-control-allow-origin: *
cache-control: public, max-age=31536000, immutable
content-encoding: br`}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-[#1E2436] mt-4">
          <button
            onClick={() => { playHudClick(); onClose(); }}
            className="hud-btn hud-btn-primary text-xs"
          >
            Close Audit Log
          </button>
        </div>

      </div>
    </div>
  );
}
