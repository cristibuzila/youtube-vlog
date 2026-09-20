import React, { useState } from 'react';
import { X, Users, Bot, Clock, MapPin, Shield, Target, Play } from 'lucide-react';
import { PlayerRole } from '../types';

interface CreateGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (config: {
    code: string;
    durationMinutes: number;
    withBots: boolean;
    hostName: string;
    hostNickname: string;
    hostAvatar: string;
    hostRole: PlayerRole;
  }) => void;
}

export function CreateGameModal({ isOpen, onClose, onCreate }: CreateGameModalProps) {
  const [code, setCode] = useState<string>(() => `CAHUL${Math.floor(10 + Math.random() * 90)}`);
  const [withBots, setWithBots] = useState<boolean>(false); // default to REAL players for multiplayer
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [hostName, setHostName] = useState<string>('Host Player');
  const [hostNickname, setHostNickname] = useState<string>('HOST');
  const [hostAvatar, setHostAvatar] = useState<string>('👑');
  const [hostRole, setHostRole] = useState<PlayerRole>('SEEKER');

  if (!isOpen) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    onCreate({
      code: code.trim().toUpperCase(),
      durationMinutes,
      withBots,
      hostName: hostName.trim() || 'Host',
      hostNickname: hostNickname.trim().toUpperCase() || 'HOST',
      hostAvatar,
      hostRole,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative text-neutral-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-neutral-800/60 hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl text-amber-400">
            🎯
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase">
              NEW COMPETITION
            </span>
            <h2 className="text-xl font-black text-white font-display">CREATE GAME ROOM</h2>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-5 text-left">
          {/* 1. Room Code */}
          <div>
            <label className="text-xs font-mono font-bold text-neutral-400 block mb-1">
              GAME ROOM CODE:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={10}
                placeholder="CAHUL77"
                className="flex-1 px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-amber-400 font-mono font-black text-lg uppercase tracking-wider focus:outline-none focus:border-amber-500 transition"
              />
              <button
                type="button"
                onClick={() => setCode(`CAHUL${Math.floor(10 + Math.random() * 90)}`)}
                className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-neutral-300 transition"
              >
                Random
              </button>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1">
              Share this code or your direct link with real players to join.
            </p>
          </div>

          {/* 2. Mode: Real Players vs Bots */}
          <div>
            <label className="text-xs font-mono font-bold text-neutral-400 block mb-1.5">
              GAME FORMAT:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setWithBots(false)}
                className={`p-3 rounded-2xl border text-left transition flex flex-col gap-1 ${
                  !withBots
                    ? 'bg-amber-500/10 border-amber-500/50 text-white'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <Users className="w-4 h-4" />
                  <span>REAL PLAYERS ONLY</span>
                </div>
                <span className="text-[11px] text-neutral-400 leading-tight">
                  Clean lobby. Real players join via invite link or room code.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setWithBots(true)}
                className={`p-3 rounded-2xl border text-left transition flex flex-col gap-1 ${
                  withBots
                    ? 'bg-purple-500/10 border-purple-500/50 text-white'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-400">
                  <Bot className="w-4 h-4" />
                  <span>PRACTICE WITH BOTS</span>
                </div>
                <span className="text-[11px] text-neutral-400 leading-tight">
                  Pre-loads simulated runners for testing or solo gameplay.
                </span>
              </button>
            </div>
          </div>

          {/* 3. Match Duration */}
          <div>
            <label className="text-xs font-mono font-bold text-neutral-400 block mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>MATCH DURATION:</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { mins: 15, label: '15 min', desc: 'Sprint' },
                { mins: 30, label: '30 min', desc: 'Quick' },
                { mins: 60, label: '60 min', desc: 'Standard' },
                { mins: 90, label: '90 min', desc: 'Epic' },
              ].map((item) => (
                <button
                  key={item.mins}
                  type="button"
                  onClick={() => setDurationMinutes(item.mins)}
                  className={`p-2.5 rounded-xl border text-center transition ${
                    durationMinutes === item.mins
                      ? 'bg-amber-500 text-black border-amber-400 font-black'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  <div className="text-xs font-bold">{item.label}</div>
                  <div className={`text-[10px] ${durationMinutes === item.mins ? 'text-black/70' : 'text-neutral-500'}`}>
                    {item.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Host Info */}
          <div className="border-t border-neutral-800/80 pt-4 space-y-3">
            <div className="text-xs font-mono font-bold text-neutral-400 uppercase">
              YOUR PLAYER PROFILE (HOST):
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-mono text-neutral-400 block mb-1">NAME:</label>
                <input
                  type="text"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  placeholder="Cristian"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm font-medium focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-neutral-400 block mb-1">CALLSIGN:</label>
                <input
                  type="text"
                  value={hostNickname}
                  onChange={(e) => setHostNickname(e.target.value.toUpperCase())}
                  placeholder="HUNTER"
                  className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm font-mono text-amber-400 uppercase focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-neutral-400 block mb-1.5">AVATAR:</label>
              <div className="flex flex-wrap gap-2">
                {['👑', '🎯', '🦁', '🦅', '🐺', '🦊', '⚡', '🕵️'].map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setHostAvatar(emoji)}
                    className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition border ${
                      hostAvatar === emoji
                        ? 'bg-amber-500/20 border-amber-500 scale-110 shadow-md'
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-neutral-400 block mb-1.5">YOUR ROLE:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setHostRole('SEEKER')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 ${
                    hostRole === 'SEEKER'
                      ? 'bg-rose-950 border-rose-500 text-rose-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>SEEKER</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHostRole('HIDER')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 ${
                    hostRole === 'HIDER'
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <span>🏃</span>
                  <span>HIDER</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHostRole('ADMIN')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 ${
                    hostRole === 'ADMIN'
                      ? 'bg-amber-950 border-amber-500 text-amber-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>MASTER</span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm tracking-wider uppercase shadow-xl shadow-amber-500/20 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>CREATE & OPEN LOBBY</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
