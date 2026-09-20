import React, { useState } from 'react';
import { Player } from '../types';
import { AlertOctagon, PhoneCall, ShieldCheck, X } from 'lucide-react';

interface SafetySOSModalProps {
  player: Player;
  onSendSOS: (message: string) => Promise<void>;
  onCancelSOS: () => Promise<void>;
  onClose: () => void;
}

export const SafetySOSModal: React.FC<SafetySOSModalProps> = ({
  player,
  onSendSOS,
  onCancelSOS,
  onClose,
}) => {
  const [message, setMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  const isSOSActive = player.sosAlert?.active;

  const handleTrigger = async () => {
    setIsSending(true);
    try {
      await onSendSOS(message || 'I need immediate assistance at my location!');
    } finally {
      setIsSending(false);
    }
  };

  const handleResolve = async () => {
    setIsSending(true);
    try {
      await onCancelSOS();
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-700 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-red-900/80 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-center space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-neutral-800 text-neutral-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500 mx-auto flex items-center justify-center text-red-500 text-3xl">
          🚨
        </div>

        <div>
          <span className="text-xs font-mono font-bold text-red-400 uppercase tracking-widest">
            EMERGENCY SAFETY DISPATCH
          </span>
          <h2 className="text-xl font-black text-white font-display mt-0.5">
            CAHUL SAFETY & SOS
          </h2>
          <p className="text-xs text-neutral-300 mt-1">
            Instantly alerts the Game Master with your exact GPS position in Cahul.
          </p>
        </div>

        {isSOSActive ? (
          <div className="p-4 bg-red-950/70 border border-red-700 rounded-2xl text-left space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-red-300">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              <span>ACTIVE SOS TRANSMITTING TO GAME MASTER...</span>
            </div>
            <div className="text-xs text-neutral-300 font-mono">
              Coordinates: {player.location.lat.toFixed(5)}, {player.location.lng.toFixed(5)}
            </div>
            <div className="text-xs text-neutral-300 italic">
              "{player.sosAlert?.message}"
            </div>

            <button
              onClick={handleResolve}
              disabled={isSending}
              className="w-full mt-2 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs transition"
            >
              {isSending ? 'Updating...' : 'I am safe now (Resolve SOS)'}
            </button>
          </div>
        ) : (
          <div className="space-y-3 text-left">
            <label className="text-xs font-bold text-neutral-300">
              Optional message for Game Master:
            </label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Minor injury, lost phone, traffic issue..."
              className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:border-red-500 transition"
            />

            <button
              id="btn-dispatch-sos"
              onClick={handleTrigger}
              disabled={isSending}
              className="w-full py-3.5 px-6 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-sm tracking-wider uppercase shadow-xl shadow-red-900/50 transition active:scale-95 disabled:opacity-50"
            >
              {isSending ? 'DISPATCHING...' : 'SEND SOS TO GAME MASTER NOW'}
            </button>

            <p className="text-[10px] text-center text-neutral-500 font-mono">
              This temporarily pauses your competition penalties and pins your emergency location.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
