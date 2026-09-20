import React, { useState } from 'react';
import { GameRoom, Player } from '../types';
import { formatTimeRemaining } from '../utils/geo';
import { Trophy, Award, Clock, Users, Skull, Target, ShieldAlert, CheckCircle2, ChevronRight, X } from 'lucide-react';

interface GameStatsModalProps {
  room: GameRoom;
  onClose: () => void;
}

export const GameStatsModal: React.FC<GameStatsModalProps> = ({ room, onClose }) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const players = Object.values(room.players);
  const hiders = players.filter((p) => p.role === 'HIDER');

  // Sort players by: Bingo achieved > Completed Bingo count > Survived
  const rankedContestants = [...hiders].sort((a, b) => {
    if (a.bingo?.hasWonBingo && !b.bingo?.hasWonBingo) return -1;
    if (!a.bingo?.hasWonBingo && b.bingo?.hasWonBingo) return 1;

    const countA = a.bingo?.completedCount || 0;
    const countB = b.bingo?.completedCount || 0;
    if (countB !== countA) return countB - countA;

    const aliveA = a.status !== 'ELIMINATED' ? 1 : 0;
    const aliveB = b.status !== 'ELIMINATED' ? 1 : 0;
    return aliveB - aliveA;
  });

  const totalChallengesCompleted = players.reduce(
    (acc, p) => acc + (p.bingo?.completedCount || 0),
    0
  );
  const totalEliminated = players.filter((p) => p.status === 'ELIMINATED').length;
  const totalBingos = players.filter((p) => p.bingo?.hasWonBingo).length;
  const boundaryViolations = room.events.filter((e) => e.type === 'BOUNDARY_WARNING').length;

  const activeTimelinePlayer = selectedPlayerId ? room.players[selectedPlayerId] : rankedContestants[0];

  return (
    <div className="fixed inset-0 z-650 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 text-2xl">
              🏆
            </div>
            <div>
              <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                FINAL RESULTS & TIMELINE
              </div>
              <h2 className="text-xl font-black text-white font-display">
                CAHUL HUNT — WINNERS & STATISTICS
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SECTION 28: WINNERS PODIUM */}
        <div className="my-6">
          <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider mb-3">
            LEADERBOARD PODIUM
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {rankedContestants.slice(0, 3).map((contestant, idx) => {
              const medals = ['🥇', '🥈', '🥉'];
              const borders = [
                'border-amber-500/80 bg-amber-950/20',
                'border-neutral-400/80 bg-neutral-900/40',
                'border-amber-800/80 bg-amber-950/10',
              ];

              return (
                <div
                  key={contestant.id}
                  onClick={() => setSelectedPlayerId(contestant.id)}
                  className={`p-4 rounded-2xl border ${borders[idx]} flex flex-col justify-between cursor-pointer hover:scale-102 transition shadow-lg`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{medals[idx]}</span>
                    <span className="text-xl">{contestant.avatar}</span>
                  </div>

                  <div className="my-3">
                    <div className="text-base font-black text-white">{contestant.name}</div>
                    <div className="text-xs text-neutral-400 font-mono">@{contestant.nickname}</div>
                  </div>

                  <div className="border-t border-neutral-800/80 pt-2 text-xs font-mono space-y-1">
                    <div className="flex justify-between text-neutral-300">
                      <span>BINGO:</span>
                      <span className="text-amber-400 font-bold">
                        {contestant.bingo?.completedCount || 0}/25 ({contestant.bingo?.linesCount || 0} lines)
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>STATUS:</span>
                      <span className={contestant.status === 'ELIMINATED' ? 'text-red-400' : 'text-emerald-400'}>
                        {contestant.status === 'ELIMINATED' ? 'ELIMINATED' : 'SURVIVED'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 30: GAME STATISTICS SUMMARY */}
        <div className="my-6 bg-neutral-950/80 border border-neutral-800 rounded-2xl p-5">
          <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider mb-4">
            GAME OVERVIEW DATA (YOUTUBE READY)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center font-mono">
            <div className="p-3 bg-neutral-900/80 rounded-xl border border-neutral-800">
              <div className="text-xs text-neutral-400">GAME LENGTH</div>
              <div className="text-lg font-black text-white mt-1">
                {formatTimeRemaining(room.initialDurationSeconds - room.remainingSeconds)}
              </div>
            </div>

            <div className="p-3 bg-neutral-900/80 rounded-xl border border-neutral-800">
              <div className="text-xs text-neutral-400">CONTESTANTS</div>
              <div className="text-lg font-black text-white mt-1">{players.length}</div>
            </div>

            <div className="p-3 bg-neutral-900/80 rounded-xl border border-neutral-800">
              <div className="text-xs text-red-400">ELIMINATED</div>
              <div className="text-lg font-black text-red-400 mt-1">{totalEliminated}</div>
            </div>

            <div className="p-3 bg-neutral-900/80 rounded-xl border border-neutral-800">
              <div className="text-xs text-amber-400">BINGOS COMPLETED</div>
              <div className="text-lg font-black text-amber-400 mt-1">{totalBingos}</div>
            </div>

            <div className="p-3 bg-neutral-900/80 rounded-xl border border-neutral-800">
              <div className="text-xs text-purple-400">REVEALS USED</div>
              <div className="text-lg font-black text-purple-400 mt-1">
                {room.seeker.revealsUsed} / 3
              </div>
            </div>

            <div className="p-3 bg-neutral-900/80 rounded-xl border border-neutral-800">
              <div className="text-xs text-amber-400">BOUNDARY VIOLATIONS</div>
              <div className="text-lg font-black text-amber-400 mt-1">{boundaryViolations}</div>
            </div>

            <div className="p-3 bg-neutral-900/80 rounded-xl border border-neutral-800 sm:col-span-2">
              <div className="text-xs text-emerald-400">TOTAL PROOFS COMPLETED</div>
              <div className="text-lg font-black text-emerald-400 mt-1">{totalChallengesCompleted}</div>
            </div>
          </div>
        </div>

        {/* SECTION 31: CONTESTANT TIMELINE FOR YOUTUBE EDITING */}
        {activeTimelinePlayer && (
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{activeTimelinePlayer.avatar}</span>
                <div>
                  <h3 className="text-sm font-black text-white">
                    {activeTimelinePlayer.name.toUpperCase()}'S COMPLETE TIMELINE
                  </h3>
                  <p className="text-[11px] text-neutral-400 font-mono">
                    Essential timestamp markers for YouTube video edit
                  </p>
                </div>
              </div>

              {/* Selector */}
              <select
                value={activeTimelinePlayer.id}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white font-mono"
              >
                {rankedContestants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.nickname})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto font-mono text-xs pr-1">
              {activeTimelinePlayer.timeline.length === 0 ? (
                <div className="text-neutral-500 italic py-2">No timeline events recorded yet.</div>
              ) : (
                activeTimelinePlayer.timeline.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-2 rounded-xl bg-neutral-900/60 border border-neutral-800/60"
                  >
                    <span className="text-amber-400 font-bold shrink-0">{entry.timeStr}</span>
                    <span className="text-neutral-300">{entry.text}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition"
          >
            CLOSE RESULTS
          </button>
        </div>
      </div>
    </div>
  );
};
