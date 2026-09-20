import React from 'react';
import { Player } from '../types';
import { AlertTriangle, ShieldCheck, Skull } from 'lucide-react';

interface BoundaryWarningBannerProps {
  player: Player;
  onReturnQuickTest?: () => void;
}

export const BoundaryWarningBanner: React.FC<BoundaryWarningBannerProps> = ({
  player,
  onReturnQuickTest,
}) => {
  const isEliminated = player.status === 'ELIMINATED';
  const isOutside = player.warningCountdown !== null;

  if (!isOutside && !isEliminated) return null;

  if (isEliminated) {
    return (
      <div className="fixed inset-0 z-700 bg-red-950/95 backdrop-blur-lg flex items-center justify-center p-6 text-center animate-in fade-in">
        <div className="max-w-md w-full bg-black/80 border-2 border-red-600 rounded-3xl p-8 shadow-2xl space-y-4">
          <div className="w-20 h-20 rounded-full bg-red-600/20 border-2 border-red-500 mx-auto flex items-center justify-center text-4xl">
            ☠️
          </div>
          <h2 className="text-2xl font-black text-red-500 uppercase tracking-widest font-display">
            YOU HAVE BEEN ELIMINATED
          </h2>
          <div className="bg-red-900/40 border border-red-800 p-3 rounded-2xl text-xs text-red-200 font-mono">
            Reason: LEFT GAME AREA / EXPIRED TIMEOUT
          </div>
          <p className="text-sm text-neutral-300">
            Your Cahul Hunt run has ended. You can still spectate the map and cheer for remaining contestants.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-4 top-16 z-650 flex justify-center pointer-events-none">
      <div className="pointer-events-auto max-w-lg w-full bg-red-600 border-4 border-red-300 text-white rounded-3xl p-6 shadow-2xl text-center space-y-3 animate-bounce">
        <div className="flex items-center justify-center gap-2">
          <AlertTriangle className="w-8 h-8 text-yellow-300 animate-pulse" />
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider font-display">
            ⚠️ YOU LEFT THE GAME AREA
          </h2>
        </div>

        <div className="text-sm sm:text-base font-extrabold text-red-100">
          RETURN TO THE CAHUL GAME ZONE IMMEDIATELY!
        </div>

        {/* Big countdown digit */}
        <div className="w-20 h-20 rounded-full bg-black/60 border-4 border-yellow-400 mx-auto flex items-center justify-center text-4xl font-black font-mono text-yellow-300 shadow-inner">
          {player.warningCountdown}
        </div>

        <div className="text-xs text-red-100 font-mono">
          System automatically eliminates after countdown reaches 0
        </div>

        {onReturnQuickTest && (
          <button
            onClick={onReturnQuickTest}
            className="mt-2 px-5 py-2 rounded-xl bg-white text-red-600 font-black text-xs hover:bg-neutral-100 transition shadow-lg active:scale-95 pointer-events-auto"
          >
            🛡️ STEP BACK INSIDE ZONE (QUICK TEST)
          </button>
        )}
      </div>
    </div>
  );
};
