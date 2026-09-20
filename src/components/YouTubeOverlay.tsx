import React from 'react';
import { YouTubeBanner } from '../types';
import { AlertTriangle, Award, Crosshair, Skull, Clock, Bell, X } from 'lucide-react';

interface YouTubeOverlayProps {
  banners: YouTubeBanner[];
  onDismiss?: (id: string) => void;
}

export const YouTubeOverlay: React.FC<YouTubeOverlayProps> = ({ banners, onDismiss }) => {
  if (banners.length === 0) return null;

  const current = banners[0];

  let bgClass = 'bg-neutral-900 border-neutral-700 text-white';
  let icon = <Bell className="w-6 h-6 text-amber-400" />;

  if (current.type === 'warning') {
    bgClass = 'bg-gradient-to-r from-amber-600 to-yellow-600 border-amber-400 text-black shadow-amber-500/50';
    icon = <AlertTriangle className="w-8 h-8 text-black animate-bounce" />;
  } else if (current.type === 'elimination') {
    bgClass = 'bg-gradient-to-r from-red-700 to-rose-900 border-red-500 text-white shadow-red-600/50';
    icon = <Skull className="w-8 h-8 text-white animate-pulse" />;
  } else if (current.type === 'reveal') {
    bgClass = 'bg-gradient-to-r from-purple-700 to-indigo-900 border-purple-400 text-white shadow-purple-600/50';
    icon = <Crosshair className="w-8 h-8 text-white animate-spin" />;
  } else if (current.type === 'bingo') {
    bgClass = 'bg-gradient-to-r from-emerald-600 to-teal-700 border-emerald-400 text-white shadow-emerald-500/50';
    icon = <Award className="w-8 h-8 text-yellow-300 animate-bounce" />;
  } else if (current.type === 'countdown') {
    bgClass = 'bg-gradient-to-r from-blue-700 to-cyan-800 border-blue-400 text-white shadow-blue-500/50';
    icon = <Clock className="w-8 h-8 text-white" />;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-600 pointer-events-none flex justify-center">
      <div
        className={`pointer-events-auto max-w-2xl w-full p-4 rounded-3xl border-2 shadow-2xl backdrop-blur-md flex items-center justify-between gap-4 transition-all duration-300 animate-in fade-in slide-in-from-top-6 ${bgClass}`}
      >
        <div className="flex items-center gap-3.5">
          <div className="shrink-0">{icon}</div>
          <div>
            <div className="text-sm sm:text-base font-black tracking-wider uppercase font-display">
              {current.title}
            </div>
            {current.subtitle && (
              <div className="text-xs sm:text-sm font-semibold opacity-90 mt-0.5">
                {current.subtitle}
              </div>
            )}
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={() => onDismiss(current.id)}
            className="p-1 rounded-full bg-black/30 hover:bg-black/50 text-white transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
