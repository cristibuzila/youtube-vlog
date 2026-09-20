import React, { useState } from 'react';
import { GameRoom, Player } from '../types';
import { Crosshair, Eye, EyeOff, ShieldAlert, AlertTriangle, Clock, Zap, CheckCircle2 } from 'lucide-react';

interface SeekerControlProps {
  room: GameRoom;
  activeSeekerPlayer: Player;
  onUseReveal: (targetPlayerId: string) => Promise<void>;
}

export const SeekerControl: React.FC<SeekerControlProps> = ({
  room,
  onUseReveal,
}) => {
  const [showRevealPicker, setShowRevealPicker] = useState<boolean>(false);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const seekerState = room.seeker;
  const revealsLeft = seekerState.revealsTotal - seekerState.revealsUsed;

  const hiders = Object.values(room.players).filter((p) => p.role === 'HIDER');
  const aliveHiders = hiders.filter((p) => p.status !== 'ELIMINATED');
  const visibleHiders = aliveHiders.filter(
    (p) => p.isVoluntarilyVisible || !p.isGhostMode || (p.revealedUntil && p.revealedUntil > Date.now())
  );
  const hiddenHiders = aliveHiders.filter(
    (p) => p.isGhostMode && !p.isVoluntarilyVisible && (!p.revealedUntil || p.revealedUntil <= Date.now())
  );

  const activeReveal = seekerState.activeReveal;
  const revealSecondsLeft = activeReveal
    ? Math.max(0, Math.ceil((activeReveal.expiresAt - Date.now()) / 1000))
    : 0;

  const handleStartReveal = () => {
    if (revealsLeft <= 0) return;
    setShowRevealPicker(true);
  };

  const handleSelectTarget = (pId: string) => {
    setSelectedTargetId(pId);
    setShowConfirmModal(true);
  };

  const handleConfirmReveal = async () => {
    if (!selectedTargetId) return;
    setIsProcessing(true);
    try {
      await onUseReveal(selectedTargetId);
      setShowConfirmModal(false);
      setShowRevealPicker(false);
      setSelectedTargetId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedTargetPlayer = selectedTargetId ? room.players[selectedTargetId] : null;

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Seeker Tactical Header */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
              <Crosshair className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-wide text-white uppercase font-display">
                SEEKER RADAR CONTROL
              </h2>
              <p className="text-xs text-neutral-400">
                Track and eliminate Cahul hiders • 3 Reveals total
              </p>
            </div>
          </div>

          {/* Reveal Counter Badge */}
          <div className="px-3.5 py-1.5 rounded-2xl bg-rose-950/70 border border-rose-800 text-rose-300 flex items-center gap-2 font-mono">
            <Zap className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-extrabold uppercase">
              {revealsLeft} / {seekerState.revealsTotal} REVEALS LEFT
            </span>
          </div>
        </div>

        {/* Active Reveal Countdown Banner if triggered */}
        {activeReveal && revealSecondsLeft > 0 && (
          <div className="mb-4 bg-purple-950/80 border border-purple-600 rounded-2xl p-4 shadow-xl animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">📡</span>
                <div>
                  <div className="text-xs font-extrabold text-purple-200 uppercase tracking-wider font-mono">
                    ACTIVE REVEAL IN PROGRESS
                  </div>
                  <div className="text-sm font-black text-white">
                    {activeReveal.targetName}'s position is revealed on the map!
                  </div>
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-purple-300">
                {revealSecondsLeft}s
              </div>
            </div>
          </div>
        )}

        {/* Big tactile Reveal Player button */}
        <div className="mt-2">
          <button
            id="btn-seeker-reveal-player"
            disabled={revealsLeft <= 0 || (activeReveal !== null && revealSecondsLeft > 0)}
            onClick={handleStartReveal}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-base tracking-wider uppercase shadow-xl shadow-rose-900/30 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Crosshair className="w-5 h-5" />
            <span>
              {revealsLeft <= 0
                ? 'ALL 3 REVEALS CONSUMED'
                : activeReveal && revealSecondsLeft > 0
                ? `REVEAL ACTIVE (${revealSecondsLeft}s)`
                : 'REVEAL PLAYER (15 SECONDS)'}
            </span>
          </button>
          <p className="text-[11px] text-center text-neutral-500 mt-1.5 font-mono">
            Reveals target position for 15s. Protected by anti-spam verification.
          </p>
        </div>
      </div>

      {/* Roster: Alive / Visible vs Hidden */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Visible Hiders */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Eye className="w-4 h-4" /> VISIBLE PLAYERS ({visibleHiders.length})
            </span>
          </div>

          <div className="space-y-2">
            {visibleHiders.length === 0 ? (
              <div className="text-xs text-neutral-500 italic py-3 text-center">
                No hiders currently visible
              </div>
            ) : (
              visibleHiders.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{p.avatar}</span>
                    <div>
                      <div className="text-xs font-bold text-white">{p.name}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">@{p.nickname}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 text-[10px] font-bold border border-emerald-800">
                    ON MAP
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Hidden Hiders (Ghost Mode) */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <EyeOff className="w-4 h-4" /> HIDDEN PLAYERS ({hiddenHiders.length})
            </span>
          </div>

          <div className="space-y-2">
            {hiddenHiders.length === 0 ? (
              <div className="text-xs text-neutral-500 italic py-3 text-center">
                All hiders are visible or eliminated
              </div>
            ) : (
              hiddenHiders.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{p.avatar}</span>
                    <div>
                      <div className="text-xs font-bold text-white">{p.name}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">@{p.nickname}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-400 text-[10px] font-bold">
                    GHOST MODE
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Target Picker Modal */}
      {showRevealPicker && !showConfirmModal && (
        <div className="fixed inset-0 z-500 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-mono font-bold text-rose-400 uppercase">
                  SEEKER REVEAL SYSTEM
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  WHO DO YOU WANT TO REVEAL?
                </h3>
              </div>
              <button
                onClick={() => setShowRevealPicker(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-400 mb-4">
              Select one hidden player. Their exact GPS location in Cahul will be exposed to you for 15 seconds.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {aliveHiders.map((p) => (
                <button
                  id={`btn-select-target-${p.id}`}
                  key={p.id}
                  onClick={() => handleSelectTarget(p.id)}
                  className="w-full p-3 rounded-2xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-between transition text-left group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{p.avatar}</span>
                    <div>
                      <div className="text-sm font-bold text-white group-hover:text-amber-400 transition">
                        {p.name} ({p.nickname})
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono">
                        Status: {p.status} • Reveals used on him: {p.revealsUsedOnHim}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-rose-400 uppercase font-mono">
                    SELECT →
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowRevealPicker(false)}
                className="px-4 py-2 rounded-xl text-neutral-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Anti-Spam Confirmation Modal */}
      {showConfirmModal && selectedTargetPlayer && (
        <div className="fixed inset-0 z-500 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-rose-900/60 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/40 mx-auto flex items-center justify-center text-rose-500 mb-3">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-white uppercase tracking-wide">
              ARE YOU SURE?
            </h3>
            <p className="text-xs text-neutral-300 mt-2">
              You are about to consume 1 Reveal on <span className="font-bold text-amber-400">{selectedTargetPlayer.name}</span>.
            </p>
            <p className="text-[11px] text-neutral-500 mt-1 font-mono">
              Their location will appear for 15 seconds. This cannot be undone.
            </p>

            <div className="grid grid-cols-2 gap-2.5 mt-6">
              <button
                id="btn-cancel-reveal-confirm"
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedTargetId(null);
                }}
                className="py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition"
              >
                CANCEL
              </button>
              <button
                id="btn-confirm-use-reveal"
                disabled={isProcessing}
                onClick={handleConfirmReveal}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-950/50 transition active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? 'ACTIVATING...' : 'USE REVEAL'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
