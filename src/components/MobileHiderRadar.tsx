import React, { useEffect, useState } from 'react';
import { GameRoom, Player } from '../types';
import { calculateDistanceMeters, CAHUL_DEFAULT_BOUNDARY, isPointInPolygon } from '../utils/geo';
import { Eye, EyeOff, Radio, Shield, AlertTriangle, Smartphone, Volume2, VolumeX, Flame } from 'lucide-react';
import { triggerHaptic, playTacticalSound, requestScreenWakeLock, releaseScreenWakeLock } from '../utils/mobileDevice';

interface MobileHiderRadarProps {
  room: GameRoom;
  player: Player;
  onToggleGhostMode: () => Promise<void>;
  onToggleShowMe: () => Promise<void>;
}

export const MobileHiderRadar: React.FC<MobileHiderRadarProps> = ({
  room,
  player,
  onToggleGhostMode,
  onToggleShowMe,
}) => {
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Find active seeker
  const seeker = Object.values(room.players).find((p) => p.role === 'SEEKER' && p.status !== 'ELIMINATED');

  // Calculate distance from this hider to seeker
  const distanceToSeeker = seeker
    ? Math.round(
        calculateDistanceMeters(
          player.location.lat,
          player.location.lng,
          seeker.location.lat,
          seeker.location.lng
        )
      )
    : null;

  // Boundary check
  const isInsideBoundary = isPointInPolygon(
    player.location.lat,
    player.location.lng,
    CAHUL_DEFAULT_BOUNDARY.coordinates
  );

  // Trigger haptics and alert sounds if seeker is close (< 100m)
  useEffect(() => {
    if (distanceToSeeker !== null && distanceToSeeker < 100) {
      triggerHaptic('alert');
      if (soundEnabled) {
        playTacticalSound('proximity');
      }
    }
  }, [distanceToSeeker, soundEnabled]);

  // Request wake lock on mobile
  const toggleWakeLock = async () => {
    if (wakeLockActive) {
      await releaseScreenWakeLock();
      setWakeLockActive(false);
    } else {
      const success = await requestScreenWakeLock();
      setWakeLockActive(success);
    }
  };

  const getDangerLevel = () => {
    if (distanceToSeeker === null) return { text: 'SEEKER OFFLINE', color: 'neutral', bg: 'bg-neutral-900', border: 'border-neutral-800' };
    if (distanceToSeeker < 80) return { text: 'EXTREME DANGER (<80m)', color: 'rose', bg: 'bg-rose-950/80', border: 'border-rose-600', pulse: true };
    if (distanceToSeeker < 200) return { text: 'CAUTION (APPROACHING)', color: 'amber', bg: 'bg-amber-950/60', border: 'border-amber-600', pulse: false };
    return { text: 'SAFE DISTANCE', color: 'emerald', bg: 'bg-emerald-950/40', border: 'border-emerald-600/40', pulse: false };
  };

  const danger = getDangerLevel();

  return (
    <div className="w-full max-w-md mx-auto space-y-4 pb-12 animate-in fade-in">
      {/* Mobile Tactical Header */}
      <div className={`${danger.bg} border ${danger.border} rounded-3xl p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden transition-all duration-300`}>
        {/* Sonar rings animation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-mono font-black text-lg ${
              danger.color === 'rose'
                ? 'bg-rose-500 text-white animate-bounce'
                : danger.color === 'amber'
                ? 'bg-amber-500 text-black'
                : 'bg-emerald-500 text-black'
            }`}>
              📡
            </div>
            <div>
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-neutral-400">
                PROXIMITY RADAR
              </span>
              <h2 className="text-xl font-black text-white font-display">
                {danger.text}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl border transition ${
                soundEnabled
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-neutral-800 text-neutral-500 border-neutral-700'
              }`}
              title={soundEnabled ? 'Mute Proximity Beeps' : 'Enable Proximity Beeps'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Big Proximity Distance Meter */}
        <div className="mt-5 pt-4 border-t border-white/10 text-center">
          <span className="text-xs font-mono font-bold uppercase text-neutral-400">
            DISTANCE TO SEEKER
          </span>
          <div className="flex items-baseline justify-center gap-1.5 mt-1">
            <span className={`text-5xl font-black font-mono tracking-tight ${
              danger.color === 'rose'
                ? 'text-rose-400 drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                : danger.color === 'amber'
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}>
              {distanceToSeeker !== null ? distanceToSeeker : '---'}
            </span>
            <span className="text-lg font-bold font-mono text-neutral-400">METERS</span>
          </div>

          {seeker && (
            <p className="text-xs text-neutral-300 font-mono mt-1">
              Seeker: <span className="font-bold text-white">{seeker.avatar} {seeker.name}</span>
            </p>
          )}
        </div>
      </div>

      {/* Quick Tactical Controls (Big Thumb Targets for Phone) */}
      <div className="grid grid-cols-1 gap-3">
        {/* Ghost Mode Toggle */}
        <button
          id="btn-radar-ghost-mode"
          onClick={async () => {
            triggerHaptic('click');
            await onToggleGhostMode();
          }}
          className={`w-full min-h-[56px] p-4 rounded-2xl border text-left transition flex items-center justify-between active:scale-98 shadow-lg ${
            player.isGhostMode
              ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 ring-2 ring-cyan-500/30'
              : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${player.isGhostMode ? 'bg-cyan-500 text-black' : 'bg-neutral-800 text-neutral-400'}`}>
              {player.isGhostMode ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
            </div>
            <div>
              <div className="font-black text-sm uppercase tracking-wide">
                GHOST MODE {player.isGhostMode ? '(ACTIVE)' : '(DISABLED)'}
              </div>
              <div className="text-xs text-neutral-400">
                {player.isGhostMode ? 'Your pin is hidden from other players' : 'Tap to conceal your pin on the map'}
              </div>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase ${
            player.isGhostMode ? 'bg-cyan-500/20 text-cyan-300' : 'bg-neutral-800 text-neutral-400'
          }`}>
            {player.isGhostMode ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* Show Me Beacon Toggle */}
        <button
          id="btn-radar-show-me"
          onClick={async () => {
            triggerHaptic('click');
            await onToggleShowMe();
          }}
          className={`w-full min-h-[56px] p-4 rounded-2xl border text-left transition flex items-center justify-between active:scale-98 shadow-lg ${
            player.isVoluntarilyVisible
              ? 'bg-purple-950/90 border-purple-500 text-purple-200 ring-2 ring-purple-500/30 animate-pulse'
              : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${player.isVoluntarilyVisible ? 'bg-purple-500 text-white' : 'bg-neutral-800 text-neutral-400'}`}>
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <div className="font-black text-sm uppercase tracking-wide">
                &ldquo;SHOW ME&rdquo; BROADCAST BEACON
              </div>
              <div className="text-xs text-neutral-400">
                {player.isVoluntarilyVisible ? 'You are visibly broadcasting to the Seeker!' : 'Taunt seeker: reveal your live position for 2x points'}
              </div>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase ${
            player.isVoluntarilyVisible ? 'bg-purple-500 text-white' : 'bg-neutral-800 text-neutral-400'
          }`}>
            {player.isVoluntarilyVisible ? 'LIVE' : 'IDLE'}
          </span>
        </button>
      </div>

      {/* Field Status / Phone Battery & Screen Lock Card */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
            PHONE FIELD TOOLS
          </span>
          <span className="text-[11px] font-mono text-neutral-400">OUTDOORS MODE</span>
        </div>

        {/* Screen Wake Lock */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-950 border border-neutral-800/80">
          <div className="flex items-center gap-3">
            <Smartphone className={`w-5 h-5 ${wakeLockActive ? 'text-amber-400' : 'text-neutral-500'}`} />
            <div>
              <p className="text-xs font-bold text-white">Keep Phone Screen Awake</p>
              <p className="text-[11px] text-neutral-400">Prevents screen timeout during the match</p>
            </div>
          </div>
          <button
            onClick={toggleWakeLock}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
              wakeLockActive
                ? 'bg-amber-500 text-black shadow'
                : 'bg-neutral-800 text-neutral-300 hover:text-white'
            }`}
          >
            {wakeLockActive ? 'ACTIVE' : 'ENABLE'}
          </button>
        </div>

        {/* Boundary status */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-950 border border-neutral-800/80">
          <div className="flex items-center gap-3">
            {isInsideBoundary ? (
              <Shield className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
            )}
            <div>
              <p className="text-xs font-bold text-white">Cahul Boundary Status</p>
              <p className="text-[11px] text-neutral-400">
                {isInsideBoundary ? 'Inside permitted city boundaries' : 'WARNING: Outside boundary buffer zone'}
              </p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
            isInsideBoundary ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
          }`}>
            {isInsideBoundary ? 'IN ARENA' : 'OUTSIDE'}
          </span>
        </div>

        {/* GPS Telemetry */}
        <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800/80 text-xs font-mono flex items-center justify-between">
          <span className="text-neutral-400">GPS COORDINATES:</span>
          <span className="text-amber-400 font-bold">
            {player.location.lat.toFixed(5)}, {player.location.lng.toFixed(5)}
          </span>
        </div>
      </div>
    </div>
  );
};
