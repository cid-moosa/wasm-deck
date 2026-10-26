import React from 'react';
import { 
  Search, 
  X, 
  LayoutGrid, 
  List
} from 'lucide-react';
import { CATEGORIES, DELIVERY_MODES } from '../data/gamesData';
import { playHudClick } from '../utils/soundEffects';

export function FilterBar({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedDelivery,
  setSelectedDelivery,
  multiplayerOnly,
  setMultiplayerOnly,
  deckReadyOnly,
  setDeckReadyOnly,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  categoryCounts
}) {
  return (
    <div className="space-y-3 mb-6">
      
      {/* Category Tabs: Floating Liquid Glass Horizontal Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {CATEGORIES.map(cat => {
          const isActive = selectedCategory === cat.id;
          const count = categoryCounts[cat.id] || 0;

          return (
            <button
              key={cat.id}
              onClick={() => {
                playHudClick();
                setSelectedCategory(cat.id);
              }}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md ${
                isActive 
                  ? 'bg-white text-black font-semibold shadow-md shadow-white/10' 
                  : 'bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.09] hover:border-white/20'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`text-[10px] font-mono px-1 rounded-full ${
                isActive ? 'bg-black/10 text-black' : 'text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Secondary Row: Search & Liquid Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 560+ WebAssembly games..."
            className="w-full bg-white/[0.05] backdrop-blur-md border border-white/[0.12] rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-white/30 focus:bg-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right Filter Toggles */}
        <div className="flex items-center gap-2">
          
          {/* Deck Ready Only */}
          <button
            onClick={() => {
              playHudClick();
              setDeckReadyOnly(!deckReadyOnly);
            }}
            className={`min-btn py-1.5 px-2.5 ${
              deckReadyOnly ? 'bg-white text-black font-semibold' : 'text-slate-400'
            }`}
            title="Filter games playable directly in deck"
          >
            Instant Deck
          </button>

          {/* Multiplayer Toggle */}
          <button
            onClick={() => {
              playHudClick();
              setMultiplayerOnly(!multiplayerOnly);
            }}
            className={`min-btn py-1.5 px-2.5 ${
              multiplayerOnly ? 'bg-white text-black font-semibold' : 'text-slate-400'
            }`}
            title="Filter multiplayer games"
          >
            Multiplayer
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#12141D] border border-white/[0.08] rounded-lg p-0.5 ml-1">
            <button
              onClick={() => { playHudClick(); setViewMode("grid"); }}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "grid" ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Grid view"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { playHudClick(); setViewMode("list"); }}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "list" ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="List view"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
