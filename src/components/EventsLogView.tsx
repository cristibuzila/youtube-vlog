import React, { useState } from 'react';
import { GameEvent } from '../types';
import { History, Filter, Search, ShieldAlert, Sparkles, Crosshair, Skull, Award } from 'lucide-react';

interface EventsLogViewProps {
  events: GameEvent[];
}

export const EventsLogView: React.FC<EventsLogViewProps> = ({ events }) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredEvents = events.filter((e) => {
    if (filterType !== 'ALL') {
      if (filterType === 'WARNINGS' && !e.type.includes('BOUNDARY')) return false;
      if (filterType === 'REVEALS' && !e.type.includes('REVEAL')) return false;
      if (filterType === 'BINGO' && !e.type.includes('CHALLENGE') && !e.type.includes('BINGO')) return false;
      if (filterType === 'ELIMINATIONS' && !e.type.includes('ELIMINATED')) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.text.toLowerCase().includes(q) ||
        (e.playerName && e.playerName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 pb-8">
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <History className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="text-xl font-extrabold text-white font-display">
                CAHUL LIVE GAME EVENTS
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                Real-time chronological events log for YouTube video editing
              </p>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
            {['ALL', 'WARNINGS', 'REVEALS', 'BINGO', 'ELIMINATIONS'].map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-3 py-1 rounded-xl transition ${
                  filterType === f
                    ? 'bg-amber-500 text-black font-extrabold shadow'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by player name or keyword..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        {/* Event List */}
        <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
          {filteredEvents.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500 font-mono">
              No matching game events recorded yet.
            </div>
          ) : (
            filteredEvents.map((evt) => {
              let icon = '📌';
              let badgeBg = 'bg-neutral-800 text-neutral-300';

              if (evt.type === 'BOUNDARY_WARNING') {
                icon = '⚠️';
                badgeBg = 'bg-amber-950 text-amber-300 border border-amber-700 animate-pulse';
              } else if (evt.type === 'ELIMINATED') {
                icon = '☠️';
                badgeBg = 'bg-red-950 text-red-300 border border-red-800';
              } else if (evt.type === 'REVEAL_USED') {
                icon = '🎯';
                badgeBg = 'bg-purple-950 text-purple-300 border border-purple-800';
              } else if (evt.type === 'BINGO_ACHIEVED') {
                icon = '🏆';
                badgeBg = 'bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold';
              } else if (evt.type === 'GHOST_MODE') {
                icon = '👻';
                badgeBg = 'bg-cyan-950 text-cyan-300 border border-cyan-800';
              } else if (evt.type === 'SOS_ALERT') {
                icon = '🚨';
                badgeBg = 'bg-red-600 text-white font-black';
              }

              return (
                <div
                  key={evt.id}
                  className={`p-3 rounded-2xl border flex items-start gap-3 transition ${
                    evt.dramatic
                      ? 'bg-neutral-950 border-amber-500/50 shadow-md'
                      : 'bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700'
                  }`}
                >
                  <span className="text-lg shrink-0 mt-0.5">{icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {evt.timeStr}
                      </span>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md ${badgeBg}`}>
                        {evt.type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-neutral-200 mt-1 font-medium leading-relaxed">
                      {evt.text}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
