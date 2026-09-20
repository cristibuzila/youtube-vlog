import React from 'react';
import { Player } from '../types';
import { formatTimeRemaining } from '../utils/geo';
import { User, Skull, Crosshair, MapPin, Eye, Award, Clock, X, Shield } from 'lucide-react';

interface PlayerInspectionDrawerProps {
  player: Player;
  onClose: () => void;
  onEliminate: (playerId: string) => void;
  onRevealPlayer: (playerId: string) => void;
}

export const PlayerInspectionDrawer: React.FC<PlayerInspectionDrawerProps> = ({
  player,
  onClose,
  onEliminate,
  onRevealPlayer,
}) => {
  const isEliminated = player.status === 'ELIMINATED';

  return (
    <div className="fixed bottom-0 inset-x-0 sm:inset-x-auto sm:right-6 sm:bottom-6 z-550 max-w-md w-full p-4 pointer-events-auto">
      <div className="bg-neutral-900 border border-neutral-700 rounded-3xl p-5 shadow-2xl backdrop-blur-xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Player Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-3xl shadow-inner">
            {player.avatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white">{player.name}</h3>
              <span className="text-xs text-amber-400 font-mono font-bold">@{player.nickname}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-[10px] font-mono text-neutral-300 uppercase">
                {player.role}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${
                  isEliminated
                    ? 'bg-red-950 text-red-400'
                    : player.status === 'BINGO'
                    ? 'bg-amber-500 text-black'
                    : 'bg-emerald-950 text-emerald-400'
                }`}
              >
                STATUS: {player.status}
              </span>
            </div>
          </div>
        </div>

        {/* Telemetry Metrics from Section 23 */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-4 bg-neutral-950 p-3 rounded-2xl border border-neutral-800">
          <div>
            <span className="text-neutral-500 block text-[10px]">GPS STATUS</span>
            <span className="text-neutral-200 font-bold">ACTIVE (±{player.location.accuracy || 6}m)</span>
          </div>

          <div>
            <span className="text-neutral-500 block text-[10px]">GHOST MODE</span>
            <span className={player.isGhostMode ? 'text-cyan-400 font-bold' : 'text-neutral-400'}>
              {player.isGhostMode ? 'ON 👻' : 'OFF'}
            </span>
          </div>

          <div>
            <span className="text-neutral-500 block text-[10px]">BINGO PROGRESS</span>
            <span className="text-amber-400 font-bold">
              {player.bingo?.completedCount || 0}/25 ({player.bingo?.linesCount || 0} LINES)
            </span>
          </div>

          <div>
            <span className="text-neutral-500 block text-[10px]">TIME ALIVE</span>
            <span className="text-neutral-200 font-bold">
              {formatTimeRemaining(player.timeAliveSeconds)}
            </span>
          </div>

          <div className="col-span-2 border-t border-neutral-800/80 pt-1.5 flex justify-between">
            <span className="text-neutral-500 text-[10px]">REVEALS USED ON HIM</span>
            <span className="text-purple-400 font-bold">{player.revealsUsedOnHim}</span>
          </div>
        </div>

        {/* Actions from Section 23 */}
        <div className="flex items-center gap-2">
          {!isEliminated ? (
            <>
              <button
                id="btn-drawer-eliminate"
                onClick={() => onEliminate(player.id)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 font-black text-xs transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Skull className="w-3.5 h-3.5" />
                <span>ELIMINATE</span>
              </button>

              <button
                id="btn-drawer-reveal"
                onClick={() => onRevealPlayer(player.id)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-purple-900 hover:bg-purple-800 border border-purple-600 text-purple-200 font-black text-xs transition active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>REVEAL LOCATION</span>
              </button>
            </>
          ) : (
            <div className="w-full text-center text-xs text-red-400 font-mono py-1">
              Contestant is already eliminated
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
