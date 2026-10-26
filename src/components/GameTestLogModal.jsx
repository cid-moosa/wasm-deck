import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  Download, 
  Trash2, 
  ClipboardCheck, 
  FileText, 
  ExternalLink,
  Check,
  Copy
} from 'lucide-react';
import { playHudClick, playHudBleep } from '../utils/soundEffects';

export function GameTestLogModal({
  isOpen,
  onClose,
  testLogs,
  onClearLogs,
  onRemoveLog
}) {
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'working' | 'broken'
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const workingCount = testLogs.filter(l => l.status === 'working').length;
  const brokenCount = testLogs.filter(l => l.status === 'broken').length;

  const filteredLogs = testLogs.filter(l => {
    if (filterStatus === 'working') return l.status === 'working';
    if (filterStatus === 'broken') return l.status === 'broken';
    return true;
  });

  // Generate plain-text formatted log
  const generateLogText = () => {
    let out = "================================================================================\n";
    out += "        WASM//DECK — GAME RUNTIME TEST & VERIFICATION LOG\n";
    out += `        Generated: ${new Date().toLocaleString()} | Total Tested: ${testLogs.length}\n`;
    out += `        Working: ${workingCount} | Not Working: ${brokenCount}\n`;
    out += "================================================================================\n\n";

    if (testLogs.length === 0) {
      out += "No games have been logged yet. Use the 'Working' / 'Not Working' buttons on any game.\n";
    } else {
      testLogs.forEach((log, idx) => {
        out += `[#${idx + 1}] ${log.title.toUpperCase()}\n`;
        out += `    Status:     [${log.status === 'working' ? 'VERIFIED WORKING' : 'FLAGGED NOT WORKING'}]\n`;
        out += `    Tested At:  ${log.timestamp}\n`;
        out += `    Target URL: ${log.url}\n`;
        if (log.notes) {
          out += `    Notes:      ${log.notes}\n`;
        }
        out += "--------------------------------------------------------------------------------\n";
      });
    }

    return out;
  };

  const handleDownloadTxt = () => {
    playHudClick();
    const content = generateLogText();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wasm-deck-test-log-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    playHudBleep();
  };

  const handleDownloadJson = () => {
    playHudClick();
    const content = JSON.stringify(testLogs, null, 2);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wasm-deck-test-log-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    playHudBleep();
  };

  const handleCopy = async () => {
    playHudClick();
    try {
      await navigator.clipboard.writeText(generateLogText());
      setCopied(true);
      playHudBleep();
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      alert("Clipboard copy failed: " + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel-heavy rounded-2xl max-w-3xl w-full border border-white/[0.1] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] bg-[#0E111A] animate-modalEnter">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-[#0A0D15]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-base text-white tracking-tight flex items-center gap-2">
                Game Verification & Test Log
                <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-indigo-300 border border-white/[0.08]">
                  {testLogs.length} Logged
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Live runtime test results with 1-click log file saving
              </p>
            </div>
          </div>

          <button
            onClick={() => { playHudClick(); onClose(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats & Actions Subheader */}
        <div className="p-4 bg-white/[0.02] border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
          
          {/* Summary Pills */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { playHudClick(); setFilterStatus('all'); }}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors border cursor-pointer ${
                filterStatus === 'all' 
                  ? 'bg-white/10 text-white border-white/25 font-semibold' 
                  : 'text-slate-400 border-transparent hover:text-white'
              }`}
            >
              All: {testLogs.length}
            </button>
            <button
              onClick={() => { playHudClick(); setFilterStatus('working'); }}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors flex items-center gap-1.5 border cursor-pointer ${
                filterStatus === 'working' 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold' 
                  : 'text-emerald-400 border-transparent hover:bg-emerald-500/10'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Working: {workingCount}</span>
            </button>
            <button
              onClick={() => { playHudClick(); setFilterStatus('broken'); }}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors flex items-center gap-1.5 border cursor-pointer ${
                filterStatus === 'broken' 
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-semibold' 
                  : 'text-rose-400 border-transparent hover:bg-rose-500/10'
              }`}
            >
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Broken: {brokenCount}</span>
            </button>
          </div>

          {/* Export & Clear Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="hud-btn text-xs py-1.5 px-2.5 text-slate-300 hover:text-white"
              title="Copy log to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownloadTxt}
              className="hud-btn hud-btn-primary text-xs py-1.5 px-2.5"
              title="Download test results as .txt log file"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Save .txt Log</span>
            </button>

            <button
              onClick={handleDownloadJson}
              className="hud-btn text-xs py-1.5 px-2.5 text-indigo-300 border-indigo-500/30"
              title="Download test results as JSON file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save .json</span>
            </button>

            {testLogs.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm("Clear all game test records?")) {
                    onClearLogs();
                    playHudClick();
                  }
                }}
                className="hud-btn text-xs py-1.5 px-2 text-rose-400 hover:border-rose-500/40"
                title="Clear test log history"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

        {/* Log Entries Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 font-mono text-xs">
              <ClipboardCheck className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-slate-300">No test results found</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Click the <strong>[Working]</strong> or <strong>[Not Working]</strong> button on any game card to log test results.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map(log => {
                const isWorking = log.status === 'working';
                return (
                  <div 
                    key={log.id}
                    className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/15 transition-colors flex items-center justify-between gap-3 text-xs font-mono"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-1.5 rounded-lg shrink-0 ${isWorking ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                        {isWorking ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-sans font-semibold text-white truncate text-sm">
                            {log.title}
                          </span>
                          <span className={`text-[10px] px-2 py-0.2 rounded font-bold uppercase ${
                            isWorking ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          }`}>
                            {isWorking ? 'Working' : 'Not Working'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1 truncate">
                          <span>{log.timestamp}</span>
                          <span>•</span>
                          <a 
                            href={log.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:underline truncate max-w-xs flex items-center gap-1"
                          >
                            <span>{log.url}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => {
                          playHudClick();
                          onRemoveLog(log.id);
                        }}
                        className="p-1.5 rounded text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Remove log entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#0A0D15] border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-slate-500">
          <span>Results automatically sync with your browser's local storage</span>
          <button
            onClick={() => { playHudClick(); onClose(); }}
            className="hud-btn text-xs py-1 px-3"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
