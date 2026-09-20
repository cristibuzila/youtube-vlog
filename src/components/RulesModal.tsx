import React from 'react';
import { Shield, Check, AlertCircle, MapPin, EyeOff, Zap, Award } from 'lucide-react';

interface RulesModalProps {
  onAccept: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onAccept }) => {
  const rules = [
    { icon: '📍', title: 'Stay Inside the Game Zone', desc: 'Stay within the official Cahul boundary perimeter at all times.' },
    { icon: '⏱️', title: '10-Second Boundary Rule', desc: 'If you leave the zone buffer, you have exactly 10 seconds to return or be automatically eliminated.' },
    { icon: '🎯', title: '3 Seeker Reveals', desc: 'The seeker has only 3 reveals for the entire game, lasting 15 seconds each.' },
    { icon: '👻', title: 'Ghost Mode Mechanics', desc: 'Ghost Mode conceals your GPS pin from the seeker while keeping boundary safety active.' },
    { icon: '📸', title: 'Authentic Bingo Challenges', desc: 'Complete 25 outdoor challenges in Cahul with genuine photo/video proof approved by Game Master.' },
    { icon: '⛔', title: 'Safety & Private Property', desc: 'Do not enter private properties, dangerous rooftops, construction sites, or interfere with traffic.' },
    { icon: '🚨', title: 'Emergency SOS Available', desc: 'Tap the SOS button immediately if you need medical help or security assistance.' },
    { icon: '👑', title: 'Game Master Authority', desc: 'The Game Master reserves final discretion on challenge approvals, rules, and eliminations.' },
  ];

  return (
    <div className="fixed inset-0 z-700 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center text-2xl mb-2">
            📜
          </div>
          <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
            CAHUL HUNT PROTOCOL
          </span>
          <h2 className="text-xl font-black text-white font-display">
            OFFICIAL GAME RULES
          </h2>
          <p className="text-xs text-neutral-400">
            Read carefully before entering the live Cahul Hide & Seek match.
          </p>
        </div>

        <div className="space-y-2.5 pt-2">
          {rules.map((r, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-2xl bg-neutral-950 border border-neutral-800/80"
            >
              <span className="text-lg shrink-0 mt-0.5">{r.icon}</span>
              <div>
                <div className="text-xs font-bold text-neutral-100">{r.title}</div>
                <div className="text-[11px] text-neutral-400 leading-tight mt-0.5">{r.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3">
          <button
            id="btn-accept-rules"
            onClick={onAccept}
            className="w-full py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm tracking-wider uppercase shadow-xl shadow-amber-500/20 transition active:scale-95 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>I UNDERSTAND & AGREE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
