import React, { useState } from 'react';
import { GameRoom, Player } from '../types';
import { CAHUL_BINGO_CHALLENGES } from '../data/challenges';
import { formatTimeRemaining } from '../utils/geo';
import { 
  Play, Pause, Clock, PlusCircle, UserX, AlertOctagon, RotateCcw, 
  Check, X, Video, ShieldAlert, Users, Radio, Award, Eye, BellRing, Flag
} from 'lucide-react';

interface GameMasterControlProps {
  room: GameRoom;
  onAdminAction: (action: string, payload?: any) => Promise<void>;
  onReviewBingo: (playerId: string, challengeId: number, approved: boolean, feedback?: string) => Promise<void>;
  onSelectPlayerForInspection: (player: Player) => void;
  selectedPlayer: Player | null;
}

export const GameMasterControl: React.FC<GameMasterControlProps> = ({
  room,
  onAdminAction,
  onReviewBingo,
  onSelectPlayerForInspection,
  selectedPlayer,
}) => {
  const [rejectFeedback, setRejectFeedback] = useState<string>('');
  const [reviewingSubmission, setReviewingSubmission] = useState<{
    player: Player;
    challengeId: number;
    proofUrl?: string;
    proofNote?: string;
  } | null>(null);

  const playersList = Object.values(room.players);
  const hiders = playersList.filter((p) => p.role === 'HIDER');
  const aliveHiders = hiders.filter((p) => p.status !== 'ELIMINATED');
  const eliminatedHiders = hiders.filter((p) => p.status === 'ELIMINATED');

  // Pending Bingo submissions across all contestants
  const pendingSubmissions: Array<{
    player: Player;
    challengeId: number;
    submission: any;
    challenge: any;
  }> = [];

  playersList.forEach((p) => {
    if (p.bingo?.submissions) {
      Object.values(p.bingo.submissions).forEach((sub: any) => {
        if (sub.status === 'PENDING') {
          const challenge = CAHUL_BINGO_CHALLENGES.find((c) => c.id === sub.challengeId);
          pendingSubmissions.push({
            player: p,
            challengeId: sub.challengeId,
            submission: sub,
            challenge,
          });
        }
      });
    }
  });

  // Active SOS Emergency
  const activeSOS = playersList.filter((p) => p.sosAlert && p.sosAlert.active);

  const handleApprove = async (playerId: string, challengeId: number) => {
    await onReviewBingo(playerId, challengeId, true, 'Approved by Game Master');
    setReviewingSubmission(null);
  };

  const handleReject = async (playerId: string, challengeId: number) => {
    await onReviewBingo(playerId, challengeId, false, rejectFeedback || 'Proof was incomplete or blurred');
    setRejectFeedback('');
    setReviewingSubmission(null);
  };

  return (
    <div className="w-full space-y-5 max-w-5xl mx-auto pb-10">
      {/* SOS EMERGENCY HIGH PRIORITY BANNER */}
      {activeSOS.length > 0 && (
        <div className="bg-red-600 border-2 border-red-400 text-white rounded-3xl p-5 shadow-2xl animate-emergency flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">
              🚨
            </div>
            <div>
              <div className="text-xs font-mono font-black uppercase tracking-wider text-red-200">
                ACTIVE SOS EMERGENCY IN CAHUL
              </div>
              <h3 className="text-lg font-black">
                {activeSOS[0].name.toUpperCase()} HAS TRIGGERED SOS!
              </h3>
              <p className="text-xs text-red-100 mt-0.5">
                "{activeSOS[0].sosAlert?.message}" • Location: {activeSOS[0].location.lat.toFixed(4)}, {activeSOS[0].location.lng.toFixed(4)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAdminAction('PAUSE')}
              className="px-4 py-2 rounded-xl bg-white text-red-600 font-extrabold text-xs shadow-lg hover:bg-red-50 transition"
            >
              PAUSE GAME FOR ALL
            </button>
            <button
              onClick={() => onAdminAction('RESOLVE_SOS', { playerId: activeSOS[0].id })}
              className="px-4 py-2 rounded-xl bg-red-950 text-white font-extrabold text-xs hover:bg-black transition"
            >
              RESOLVE SOS
            </button>
          </div>
        </div>
      )}

      {/* LIVE CONTROL CENTER HEADER */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 text-2xl">
              👑
            </div>
            <div>
              <div className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase">
                LIVE CONTROL CENTER
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight font-display">
                CAHUL HUNT — GAME MASTER
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono">
            <div className="px-4 py-2 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-2">
              <span className="text-neutral-400 text-xs">STATUS:</span>
              <span
                className={`text-xs font-extrabold uppercase px-2 py-0.5 rounded-lg ${
                  room.status === 'ACTIVE'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : room.status === 'PAUSED'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : room.status === 'ENDED'
                    ? 'bg-red-950 text-red-400 border border-red-800'
                    : 'bg-neutral-800 text-neutral-300'
                }`}
              >
                {room.status}
              </span>
            </div>

            <div className="px-4 py-2 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-extrabold text-white">
                {formatTimeRemaining(room.remainingSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* METRIC COUNTERS FROM PROMPT SECTION 4 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-4">
            <div className="text-[11px] font-mono font-bold text-neutral-400 uppercase">PLAYERS</div>
            <div className="text-2xl font-black text-white mt-1 font-mono">{playersList.length}</div>
          </div>

          <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-4">
            <div className="text-[11px] font-mono font-bold text-emerald-400 uppercase">ALIVE HIDERS</div>
            <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">{aliveHiders.length}</div>
          </div>

          <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-4">
            <div className="text-[11px] font-mono font-bold text-red-400 uppercase">ELIMINATED</div>
            <div className="text-2xl font-black text-red-400 mt-1 font-mono">{eliminatedHiders.length}</div>
          </div>

          <div className="bg-neutral-950/80 border border-neutral-800 rounded-2xl p-4">
            <div className="text-[11px] font-mono font-bold text-purple-400 uppercase">REVEALS USED</div>
            <div className="text-2xl font-black text-purple-400 mt-1 font-mono">
              {room.seeker.revealsUsed} / {room.seeker.revealsTotal}
            </div>
          </div>
        </div>

        {/* PRIMARY GAME CONTROL BAR */}
        <div className="flex flex-wrap items-center gap-2.5">
          {room.status === 'WAITING' && (
            <button
              id="btn-admin-start-game"
              onClick={() => onAdminAction('START')}
              className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm tracking-wider uppercase shadow-xl shadow-amber-500/20 transition active:scale-95 flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START GAME FOR ALL</span>
            </button>
          )}

          {room.status === 'ACTIVE' && (
            <button
              id="btn-admin-pause-game"
              onClick={() => onAdminAction('PAUSE')}
              className="px-5 py-2.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-700 text-amber-200 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>PAUSE GAME</span>
            </button>
          )}

          {room.status === 'PAUSED' && (
            <button
              id="btn-admin-resume-game"
              onClick={() => onAdminAction('RESUME')}
              className="px-5 py-2.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-600 text-emerald-200 font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>RESUME GAME</span>
            </button>
          )}

          <button
            id="btn-admin-extend-10m"
            onClick={() => onAdminAction('EXTEND', { extraSeconds: 600 })}
            className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>+10 MIN</span>
          </button>

          <button
            id="btn-admin-extend-30m"
            onClick={() => onAdminAction('EXTEND', { extraSeconds: 1800 })}
            className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>+30 MIN</span>
          </button>

          <button
            id="btn-admin-end-game"
            onClick={() => {
              if (window.confirm('Call GAME OVER and finalize results?')) {
                onAdminAction('END');
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-red-950/70 hover:bg-red-900 border border-red-800 text-red-300 font-bold text-xs flex items-center gap-1.5 transition"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>END GAME</span>
          </button>

          <button
            id="btn-admin-reset-game"
            onClick={() => {
              if (window.confirm('Reset this entire game room to default waiting state?')) {
                onAdminAction('RESET');
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white font-bold text-xs flex items-center gap-1.5 transition ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>
        </div>
      </div>

      {/* SECTION 18: BINGO CHALLENGE APPROVAL QUEUE */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📸</span>
            <h3 className="text-lg font-extrabold text-white">
              BINGO SUBMISSIONS APPROVAL QUEUE
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-mono font-bold">
              {pendingSubmissions.length} PENDING
            </span>
          </div>
          <span className="text-xs text-neutral-500 font-mono">
            Review live contestant proofs
          </span>
        </div>

        {pendingSubmissions.length === 0 ? (
          <div className="p-8 text-center bg-neutral-950/50 rounded-2xl border border-neutral-800/80">
            <Check className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
            <div className="text-sm font-bold text-neutral-400">All submissions reviewed!</div>
            <div className="text-xs text-neutral-600 mt-1">
              When hiders submit photos or videos in Cahul, they appear here instantly.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingSubmissions.map(({ player, challengeId, submission, challenge }) => (
              <div
                key={`${player.id}-${challengeId}`}
                className="bg-neutral-950 border border-amber-900/50 rounded-2xl p-4 flex flex-col justify-between shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{player.avatar}</span>
                      <div>
                        <div className="text-sm font-black text-white">{player.name}</div>
                        <div className="text-[11px] text-neutral-400 font-mono">
                          Challenge #{challenge?.number || challengeId}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 text-[10px] font-bold border border-amber-800">
                      WAITING APPROVAL
                    </span>
                  </div>

                  <div className="py-3 space-y-2">
                    <div className="text-xs font-bold text-amber-300">
                      {challenge?.titleRo || challenge?.titleEn}
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      {challenge?.requirementsRo}
                    </div>
                    {submission.proofNote && (
                      <div className="text-xs bg-neutral-900 p-2 rounded-xl text-neutral-300 italic border border-neutral-800">
                        "{submission.proofNote}"
                      </div>
                    )}
                    {submission.proofUrl && (
                      <div className="rounded-xl overflow-hidden border border-neutral-800 max-h-44 bg-black flex items-center justify-center">
                        <img
                          src={submission.proofUrl}
                          alt="Proof"
                          className="max-h-44 object-contain w-full"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Approve / Reject Buttons */}
                <div className="pt-3 border-t border-neutral-800 flex items-center gap-2">
                  <button
                    id={`btn-approve-sub-${player.id}-${challengeId}`}
                    onClick={() => handleApprove(player.id, challengeId)}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-1 transition active:scale-95 shadow-lg shadow-emerald-950/40"
                  >
                    <Check className="w-4 h-4" />
                    <span>✓ APPROVE</span>
                  </button>

                  <button
                    id={`btn-reject-sub-${player.id}-${challengeId}`}
                    onClick={() => handleReject(player.id, challengeId)}
                    className="flex-1 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-red-950 text-neutral-300 hover:text-red-300 border border-neutral-700 hover:border-red-800 font-extrabold text-xs flex items-center justify-center gap-1 transition active:scale-95"
                  >
                    <X className="w-4 h-4" />
                    <span>✕ REJECT</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 23: CONTESTANT TELEMETRY & ADMIN ACTIONS */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-extrabold text-white">
              PLAYERS ROSTER & LIVE TELEMETRY
            </h3>
          </div>
          <span className="text-xs text-neutral-400 font-mono">
            Tap player for instant action
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {playersList.map((p) => {
            const isEliminated = p.status === 'ELIMINATED';
            const isOutside = p.warningCountdown !== null;
            const isSeeker = p.role === 'SEEKER';

            return (
              <div
                key={p.id}
                onClick={() => onSelectPlayerForInspection(p)}
                className={`p-4 rounded-2xl border transition cursor-pointer text-left ${
                  selectedPlayer?.id === p.id
                    ? 'bg-neutral-800/90 border-amber-500 ring-2 ring-amber-500/30'
                    : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{p.avatar}</span>
                    <div>
                      <div className="text-sm font-black text-white flex items-center gap-1">
                        <span>{p.name}</span>
                        {isSeeker && <span className="text-[10px] text-rose-400 font-bold font-mono">[SEEKER]</span>}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono">@{p.nickname}</div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono ${
                      isEliminated
                        ? 'bg-red-950 text-red-400 border border-red-800'
                        : isOutside
                        ? 'bg-amber-950 text-amber-400 border border-amber-700 animate-pulse'
                        : p.status === 'BINGO'
                        ? 'bg-amber-500 text-black font-black'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    }`}
                  >
                    {isOutside ? `⚠️ WARN (${p.warningCountdown}s)` : p.status}
                  </span>
                </div>

                {/* Telemetry info */}
                <div className="text-[11px] text-neutral-400 space-y-1 font-mono border-t border-neutral-800/70 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span>GPS:</span>
                    <span className="text-neutral-200">
                      {p.location.lat.toFixed(4)}, {p.location.lng.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>GHOST MODE:</span>
                    <span className={p.isGhostMode ? 'text-cyan-400 font-bold' : 'text-neutral-500'}>
                      {p.isGhostMode ? 'ON 👻' : 'OFF'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>BINGO PROGRESS:</span>
                    <span className="text-amber-400 font-bold">
                      {p.bingo?.completedCount || 0}/25 ({p.bingo?.linesCount || 0} lines)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>TIME ALIVE:</span>
                    <span className="text-neutral-200">
                      {formatTimeRemaining(p.timeAliveSeconds)}
                    </span>
                  </div>
                </div>

                {/* Quick actions on card */}
                {!isEliminated && (
                  <div className="mt-3 pt-2 border-t border-neutral-800/70 flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAdminAction('ELIMINATE_PLAYER', { targetPlayerId: p.id });
                      }}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 text-[10px] font-bold transition text-center"
                    >
                      [ ELIMINATE ]
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPlayerForInspection(p);
                      }}
                      className="py-1.5 px-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] font-bold transition text-center"
                    >
                      DETAILS
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 29: YOUTUBE MODE DIRECTOR CONTROLS */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-rose-500" />
            <h3 className="text-lg font-extrabold text-white">
              YOUTUBE BROADCAST BANNERS
            </h3>
          </div>
          <span className="text-xs text-neutral-400 font-mono">
            Trigger dramatic TV alerts on filming screens
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onAdminAction('TRIGGER_BANNER', { title: '🎯 PLAYER REVEALED!', subtitle: 'David\'s location exposed for 15s', type: 'reveal' })}
            className="px-3.5 py-2 rounded-xl bg-purple-950/80 border border-purple-700 hover:border-purple-500 text-purple-200 text-xs font-bold transition"
          >
            📡 "PLAYER REVEALED"
          </button>

          <button
            onClick={() => onAdminAction('TRIGGER_BANNER', { title: '⚠️ PLAYER LEFT THE ZONE!', subtitle: '10 seconds to return before elimination!', type: 'warning' })}
            className="px-3.5 py-2 rounded-xl bg-amber-950/80 border border-amber-700 hover:border-amber-500 text-amber-200 text-xs font-bold transition"
          >
            ⚠️ "PLAYER LEFT ZONE"
          </button>

          <button
            onClick={() => onAdminAction('TRIGGER_BANNER', { title: '🎉 BINGO OBJECTIVE WON!', subtitle: 'Contestant completed full Bingo line!', type: 'bingo' })}
            className="px-3.5 py-2 rounded-xl bg-emerald-950/80 border border-emerald-700 hover:border-emerald-500 text-emerald-200 text-xs font-bold transition"
          >
            🏆 "BINGO WON"
          </button>

          <button
            onClick={() => onAdminAction('TRIGGER_BANNER', { title: '☠️ PLAYER ELIMINATED!', subtitle: 'A hider has been removed from the game', type: 'elimination' })}
            className="px-3.5 py-2 rounded-xl bg-red-950/80 border border-red-700 hover:border-red-500 text-red-200 text-xs font-bold transition"
          >
            ☠️ "PLAYER ELIMINATED"
          </button>

          <button
            onClick={() => onAdminAction('TRIGGER_BANNER', { title: '⏳ FINAL 5 MINUTES!', subtitle: 'Hiders must survive the final countdown!', type: 'countdown' })}
            className="px-3.5 py-2 rounded-xl bg-blue-950/80 border border-blue-700 hover:border-blue-500 text-blue-200 text-xs font-bold transition"
          >
            ⏳ "FINAL 5 MINUTES"
          </button>
        </div>
      </div>
    </div>
  );
};
