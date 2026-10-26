import React, { useState } from 'react';
import { X, FileText, Download, Copy, Check, Code, FileDown } from 'lucide-react';
import { playHudClick, playHudBleep } from '../utils/soundEffects';

export function NotepadExporterModal({ isOpen, onClose, games }) {
  const [format, setFormat] = useState('txt'); // 'txt' | 'json'
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Generate plain-text Notepad representation
  const generateNotepadText = () => {
    let out = "================================================================================\n";
    out += "        WASM//DECK — VERIFIED CLIENT-SIDE WEBASSEMBLY GAME CATALOG\n";
    out += `        Export Date: ${new Date().toISOString().split('T')[0]} | Total Ports: ${games.length}\n`;
    out += "================================================================================\n\n";

    games.forEach((g, i) => {
      out += `[${i + 1}] ${g.title.toUpperCase()}\n`;
      out += `    Category:     ${g.category}\n`;
      out += `    Engine:       ${g.engine}\n`;
      out += `    Delivery:     ${g.delivery}\n`;
      out += `    Memory Est:   ${g.memoryEst}\n`;
      out += `    Multiplayer:  ${g.multiplayer ? 'YES' : 'NO'}\n`;
      out += `    Deck Iframe:  ${g.iframeCompatible ? 'COMPATIBLE' : 'STANDALONE TAB REQUIRED'}\n`;
      out += `    Primary URL:  ${g.primaryUrl}\n`;
      if (g.mirrors && g.mirrors.length > 0) {
        out += `    Mirrors:\n`;
        g.mirrors.forEach(m => {
          out += `      - ${m.label}: ${m.url}\n`;
        });
      }
      out += `    Tech Notes:   ${g.notes}\n`;
      out += "\n--------------------------------------------------------------------------------\n\n";
    });

    return out;
  };

  // Generate JSON string
  const generateJsonText = () => {
    return JSON.stringify(games, null, 2);
  };

  const currentExportContent = format === 'txt' ? generateNotepadText() : generateJsonText();

  // Copy to clipboard
  const handleCopy = async () => {
    playHudClick();
    try {
      await navigator.clipboard.writeText(currentExportContent);
      setCopied(true);
      playHudBleep();
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      alert("Clipboard copy failed: " + e.message);
    }
  };

  // Download file
  const handleDownload = () => {
    playHudClick();
    const filename = format === 'txt' ? 'WASM_DECK_CATALOG.txt' : 'wasm_deck_catalog.json';
    const mimeType = format === 'txt' ? 'text/plain;charset=utf-8' : 'application/json;charset=utf-8';
    const blob = new Blob([currentExportContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    playHudBleep();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel-heavy rounded-2xl max-w-3xl w-full border border-white/[0.1] p-6 shadow-2xl relative max-h-[90vh] flex flex-col animate-modalEnter">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <FileDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg text-white">1-Click Catalog Exporter</h2>
              <p className="text-xs text-slate-400">Plain-Text Notepad (.txt) or JSON Backup</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format toggle */}
            <div className="flex bg-[#10131C] border border-[#1E2436] rounded-lg p-0.5 text-xs font-mono">
              <button
                onClick={() => { playHudClick(); setFormat('txt'); }}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                  format === 'txt' ? 'bg-[#654FF0] text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Notepad .txt</span>
              </button>
              <button
                onClick={() => { playHudClick(); setFormat('json'); }}
                className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                  format === 'json' ? 'bg-[#654FF0] text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>
            </div>

            <button 
              onClick={() => { playHudClick(); onClose(); }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E2436] transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Monospace Preview Box */}
        <div className="flex-1 min-h-[300px] max-h-[420px] bg-[#08090E] border border-[#1E2436] rounded-lg p-3 overflow-auto font-mono text-[11px] text-slate-300 leading-relaxed select-text">
          <pre>{currentExportContent}</pre>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[#1E2436] mt-4">
          <span className="text-xs font-mono text-slate-400">
            {games.length} WebAssembly ports ready for export
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="hud-btn text-xs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="hud-btn hud-btn-primary text-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download .{format} File</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
