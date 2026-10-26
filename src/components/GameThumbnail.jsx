import React, { useState } from 'react';
import { Gamepad2 } from 'lucide-react';

export function GameThumbnail({ 
  src, 
  title, 
  category, 
  className = "", 
  aspect = "aspect-video",
  fallbackClassName = ""
}) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Elegant initials for fallback
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

  if (!src || error) {
    return (
      <div 
        className={`relative ${aspect} w-full overflow-hidden bg-gradient-to-br ${categoryPalettes} flex items-center justify-center border-b border-white/[0.06] select-none ${className} ${fallbackClassName}`}
      >
        {/* Subtle radial sheen */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.12),transparent_70%)]" />
        
        <div className="relative z-10 flex flex-col items-center justify-center p-3 text-center">
          <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.1] flex items-center justify-center shadow-xl backdrop-blur-md mb-2">
            <span className="font-mono font-bold text-sm text-indigo-300 tracking-wider">
              {initials}
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-300 line-clamp-1 max-w-[180px]">
            {title}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono mt-0.5">
            {category || "WebAssembly Engine"}
          </span>
        </div>

        {/* Soft bottom vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#12151F] via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  return (
    <div className={`relative ${aspect} w-full overflow-hidden bg-[#0D1017] ${className}`}>
      {/* Premium shimmer skeleton while loading */}
      {!loaded && (
        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent animate-shimmer" />
          <Gamepad2 className="w-6 h-6 text-slate-700/60" />
        </div>
      )}

      {/* Actual Thumbnail Image with no-referrer for hotlink bypass */}
      <img
        src={src}
        alt={title}
        loading="lazy"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`w-full h-full object-cover transition-all duration-500 ease-out ${
          loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
        }`}
      />

      {/* Smooth dark vignette at bottom for crisp title separation */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#12151F] via-[#12151F]/40 to-transparent pointer-events-none" />
    </div>
  );
}
