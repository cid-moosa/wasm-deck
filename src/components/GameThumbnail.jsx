import React, { useState, useEffect } from 'react';
import { Gamepad2 } from 'lucide-react';

function getInitialProxyUrl(rawUrl) {
  if (!rawUrl) return '';
  // Steam CDN headers are 100% CORS-friendly and require no proxy
  if (rawUrl.includes('steamstatic.com')) return rawUrl;
  // Wasmarcade enforces strict hotlink blocks and lacks CORS headers; proxy via Cloudflare-backed wsrv.nl
  if (rawUrl.includes('wasmarcade.com')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(rawUrl)}&w=480&output=webp`;
  }
  return rawUrl;
}

export function GameThumbnail({ 
  src, 
  title, 
  category, 
  className = "", 
  aspect = "aspect-video",
  fallbackClassName = ""
}) {
  const [currentSrc, setCurrentSrc] = useState(() => getInitialProxyUrl(src));
  const [hasTriedFallback, setHasTriedFallback] = useState(false);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCurrentSrc(getInitialProxyUrl(src));
    setHasTriedFallback(false);
    setError(false);
    setLoaded(false);
  }, [src]);

  const handleError = () => {
    if (!hasTriedFallback && src && !currentSrc.includes('wsrv.nl')) {
      // Try wsrv.nl proxy as resilient secondary tier
      setHasTriedFallback(true);
      setCurrentSrc(`https://wsrv.nl/?url=${encodeURIComponent(src)}&w=480&output=webp`);
    } else {
      setError(true);
    }
  };

  // Initials for final fallback
  const initials = title
    ? title.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : "WD";

  const categoryPalettes = {
    "aaa-console": "from-slate-900 via-indigo-950/40 to-slate-900",
    "nintendo-decomp": "from-slate-900 via-rose-950/30 to-slate-900",
    "classic-pc": "from-slate-900 via-emerald-950/30 to-slate-900",
    "modern-indie": "from-slate-900 via-violet-950/40 to-slate-900",
    "retro-arcade": "from-slate-900 via-amber-950/30 to-slate-900",
    "flash-classics": "from-slate-900 via-blue-950/30 to-slate-900",
    "hubs": "from-slate-900 via-purple-950/30 to-slate-900"
  }[category] || "from-slate-900 to-slate-950";

  if (!currentSrc || error) {
    return (
      <div 
        className={`relative ${aspect} w-full overflow-hidden bg-gradient-to-br ${categoryPalettes} flex items-center justify-center border-b border-white/[0.06] select-none ${className} ${fallbackClassName}`}
      >
        <div className="relative z-10 flex flex-col items-center justify-center p-3 text-center">
          <div className="w-10 h-10 rounded-lg bg-white/[0.06] border border-white/[0.1] flex items-center justify-center shadow-lg backdrop-blur-md mb-1.5">
            <span className="font-mono font-bold text-xs text-indigo-300 tracking-wider">
              {initials}
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-300 line-clamp-1 max-w-[180px]">
            {title}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono mt-0.5">
            {category || "WebAssembly"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${aspect} w-full overflow-hidden bg-[#0D1017] ${className}`}>
      {/* Shimmer skeleton while loading */}
      {!loaded && (
        <div className="absolute inset-0 bg-[#0E1017] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-shimmer" />
          <Gamepad2 className="w-5 h-5 text-slate-700/50" />
        </div>
      )}

      {/* Actual Thumbnail Image with hotlink & CORS resilience */}
      <img
        src={currentSrc}
        alt={title}
        loading="lazy"
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={handleError}
        className={`w-full h-full object-cover transition-opacity duration-300 ease-out ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}
