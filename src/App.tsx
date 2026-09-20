/**
 * CAHUL HUNT
 * Real-life GPS Hide & Seek + Bingo competition in Cahul, Moldova.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameRoom, Player, PlayerRole, YouTubeBanner } from './types';
import { CAHUL_DEFAULT_BOUNDARY, CAHUL_CENTER, formatTimeRemaining, calculateDistanceMeters } from './utils/geo';
import * as api from './utils/api';
import { CahulMap } from './components/CahulMap';
import { GoogleCahulMap } from './components/GoogleCahulMap';
import { BingoBoard } from './components/BingoBoard';
import { SeekerControl } from './components/SeekerControl';
import { GameMasterControl } from './components/GameMasterControl';
import { YouTubeOverlay } from './components/YouTubeOverlay';
import { BoundaryWarningBanner } from './components/BoundaryWarningBanner';
import { GameStatsModal } from './components/GameStatsModal';
import { RulesModal } from './components/RulesModal';
import { SafetySOSModal } from './components/SafetySOSModal';
import { PlayerInspectionDrawer } from './components/PlayerInspectionDrawer';
import { EventsLogView } from './components/EventsLogView';
import { CreateGameModal } from './components/CreateGameModal';
import { useRealtimeLocation } from './utils/useRealtimeLocation';
import { GpsPermissionBanner } from './components/GpsPermissionBanner';
import { PermissionsModal } from './components/PermissionsModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { MobileHiderRadar } from './components/MobileHiderRadar';
import { 
  Map as MapIcon, Target, User, Shield, AlertTriangle, Play, Users, 
  Copy, Check, Radio, Eye, EyeOff, Sparkles, Trophy, HelpCircle, PhoneCall, RefreshCw,
  Share2, LogOut, Plus, Bot, ArrowRight, Navigation, Radar as RadarIcon, Crosshair, Smartphone
} from 'lucide-react';

export default function App() {
  // Navigation & Session State
  const [screen, setScreen] = useState<'HOME' | 'REGISTER' | 'LOBBY' | 'GAME'>('HOME');
  const [activeTab, setActiveTab] = useState<'MAP' | 'RADAR' | 'BINGO' | 'EVENTS' | 'ADMIN'>('MAP');
  const [roomCode, setRoomCode] = useState<string>('C4HUL7');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('C4HUL7');
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [availableRooms, setAvailableRooms] = useState<api.RoomSummary[]>([]);
  const [activePlayerId, setActivePlayerId] = useState<string>('player-david');
  const [activeRole, setActiveRole] = useState<PlayerRole>('HIDER');
  const [mapEngine, setMapEngine] = useState<'google' | 'leaflet'>('google');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [showSOSModal, setShowSOSModal] = useState<boolean>(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState<boolean>(false);
  const [selectedInspectPlayer, setSelectedInspectPlayer] = useState<Player | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Registration Form State
  const [regName, setRegName] = useState<string>('David');
  const [regNickname, setRegNickname] = useState<string>('DAVE');
  const [regAvatar, setRegAvatar] = useState<string>('🦁');
  const [regTeam, setRegTeam] = useState<string>('Cahul Hunters');
  const [regRole, setRegRole] = useState<PlayerRole>('HIDER');
  const [permissionsGranted, setPermissionsGranted] = useState<boolean>(false);

  // Stable callback for updating GPS location on server
  const handleUpdateLocation = useCallback(async (lat: number, lng: number, accuracy?: number) => {
    if (!roomCode || !activePlayerId) return;
    await api.updateLocation(roomCode, activePlayerId, lat, lng, accuracy);
  }, [roomCode, activePlayerId]);

  // Real-Time GPS Tracking Hook
  const {
    status: gpsStatus,
    errorMessage: gpsError,
    location: realGpsLocation,
    mode: gpsMode,
    requestPermission: requestGpsPermission,
    calibrateOriginToCahul,
    switchMode: switchGpsMode,
  } = useRealtimeLocation({
    enabled: screen === 'GAME' || screen === 'LOBBY' || screen === 'REGISTER',
    onLocationUpdate: handleUpdateLocation,
    updateIntervalMs: 1500,
  });

  // Auto-detect invite link with query param (?join=CODE or ?room=CODE)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get('join') || params.get('room');
      if (codeParam) {
        const clean = codeParam.trim().toUpperCase();
        setRoomCode(clean);
        setJoinCodeInput(clean);
        setScreen('REGISTER');
      }
    } catch {}
  }, []);

  // Fetch active rooms on Home screen
  const loadRoomsList = async () => {
    const list = await api.fetchRoomsList();
    setAvailableRooms(list);
  };

  useEffect(() => {
    if (screen === 'HOME') {
      loadRoomsList();
    }
  }, [screen]);

  // Load initial room
  useEffect(() => {
    const loadInitial = async () => {
      const data = await api.fetchRoom(roomCode);
      if (data) {
        setRoom(data);
      }
    };
    loadInitial();
  }, [roomCode]);

  // Connect Server-Sent Events (SSE) for real-time live synchronization
  useEffect(() => {
    if (!roomCode) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/rooms/${encodeURIComponent(roomCode)}/stream`);
      eventSource.onmessage = (event) => {
        try {
          const updatedRoom: GameRoom = JSON.parse(event.data);
          setRoom(updatedRoom);
        } catch (err) {
          console.error('Failed to parse SSE payload', err);
        }
      };
      eventSource.onerror = () => {
        // SSE will automatically retry
      };
    } catch (err) {
      console.warn('SSE not available, using periodic polling', err);
    }

    const interval = setInterval(async () => {
      const fresh = await api.fetchRoom(roomCode);
      if (fresh) setRoom(fresh);
    }, 4000);

    return () => {
      eventSource?.close();
      clearInterval(interval);
    };
  }, [roomCode]);

  // Auto-switch to GAME view once status becomes ACTIVE
  useEffect(() => {
    if (room?.status === 'ACTIVE' && screen === 'LOBBY') {
      setScreen('GAME');
    }
  }, [room?.status, screen]);

  // Current user / player object
  const currentPlayer = room?.players[activePlayerId] || (room ? Object.values(room.players)[0] : null);

  // Active seeker and proximity distance for mobile HUD
  const activeSeeker = room ? Object.values(room.players).find((p) => p.role === 'SEEKER' && p.status !== 'ELIMINATED') : null;
  const distanceToSeeker = (currentPlayer && activeSeeker)
    ? Math.round(calculateDistanceMeters(currentPlayer.location.lat, currentPlayer.location.lng, activeSeeker.location.lat, activeSeeker.location.lng))
    : null;

  // Handlers
  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
  };

  const handleCreateGameSubmit = async (config: {
    code: string;
    durationMinutes: number;
    withBots: boolean;
    hostName: string;
    hostNickname: string;
    hostAvatar: string;
    hostRole: PlayerRole;
  }) => {
    setShowCreateModal(false);
    const newRoom = await api.createRoom({
      code: config.code,
      durationMinutes: config.durationMinutes,
      withBots: config.withBots,
    });
    if (newRoom) {
      setRoom(newRoom);
      setRoomCode(newRoom.code);
      // Join as host immediately
      const joinRes = await api.joinRoom(newRoom.code, {
        name: config.hostName,
        nickname: config.hostNickname,
        avatar: config.hostAvatar,
        role: config.hostRole,
      });
      if (joinRes) {
        setRoom(joinRes.room);
        setActivePlayerId(joinRes.player.id);
        setActiveRole(joinRes.player.role);
        setScreen('LOBBY');
        try {
          localStorage.setItem('cahul_room_code', newRoom.code);
          localStorage.setItem('cahul_player_id', joinRes.player.id);
        } catch {}
      }
    }
  };

  const handleJoinClick = () => {
    if (!joinCodeInput.trim()) return;
    const clean = joinCodeInput.trim().toUpperCase();
    setRoomCode(clean);
    setScreen('REGISTER');
  };

  const handleDirectRoomJoin = (code: string) => {
    setRoomCode(code);
    setJoinCodeInput(code);
    setScreen('REGISTER');
  };

  const handleCompleteRegistration = async (skipPermissionsCheck = false) => {
    if (!skipPermissionsCheck && gpsStatus !== 'active' && !permissionsGranted) {
      setShowPermissionsModal(true);
      return;
    }

    const res = await api.joinRoom(roomCode, {
      name: regName.trim() || 'Player',
      nickname: regNickname.trim() || 'PLAYER',
      avatar: regAvatar,
      team: regTeam.trim(),
      role: regRole,
    });

    if (res) {
      setRoom(res.room);
      setActivePlayerId(res.player.id);
      setActiveRole(res.player.role);
      setScreen(res.room.status === 'ACTIVE' ? 'GAME' : 'LOBBY');
      try {
        localStorage.setItem('cahul_room_code', roomCode);
        localStorage.setItem('cahul_player_id', res.player.id);
      } catch {}

      // If real GPS is locked, update position immediately
      if (realGpsLocation) {
        api.updateLocation(
          res.room.code,
          res.player.id,
          realGpsLocation.lat,
          realGpsLocation.lng,
          realGpsLocation.accuracy
        );
      }
    }
  };

  const handleSwitchMyRole = async (newRole: PlayerRole) => {
    if (!room || !activePlayerId) return;
    await api.switchPlayerRole(room.code, activePlayerId, newRole);
    setActiveRole(newRole);
  };

  const handleAddPracticeBot = async () => {
    if (!room) return;
    await api.addBotPlayer(room.code);
  };

  const handleLeaveCurrentRoom = async () => {
    if (room && activePlayerId) {
      await api.leaveRoom(room.code, activePlayerId);
    }
    try {
      localStorage.removeItem('cahul_room_code');
      localStorage.removeItem('cahul_player_id');
    } catch {}
    setScreen('HOME');
    loadRoomsList();
  };

  const handleStartGameFromLobby = async () => {
    if (!room) return;
    await api.sendAdminAction(room.code, 'START');
    setScreen('GAME');
  };

  const handleToggleGhostMode = async () => {
    if (!room || !currentPlayer) return;
    await api.toggleGhostMode(room.code, currentPlayer.id, !currentPlayer.isGhostMode);
  };

  const handleToggleShowMe = async () => {
    if (!room || !currentPlayer) return;
    await api.toggleShowMe(room.code, currentPlayer.id, !currentPlayer.isVoluntarilyVisible);
  };

  const handleUseSeekerReveal = async (targetPlayerId: string) => {
    if (!room) return;
    await api.useSeekerReveal(room.code, targetPlayerId);
  };

  const handleSubmitBingoProof = async (challengeId: number, proofUrl: string, proofNote: string) => {
    if (!room || !currentPlayer) return;
    await api.submitBingoProof(room.code, currentPlayer.id, challengeId, proofUrl, proofNote);
  };

  const handleReviewBingo = async (playerId: string, challengeId: number, approved: boolean, feedback?: string) => {
    if (!room) return;
    await api.reviewBingoSubmission(room.code, playerId, challengeId, approved, feedback);
  };

  const handleAdminAction = async (action: string, payload?: any) => {
    if (!room) return;
    await api.sendAdminAction(room.code, action, payload);
  };

  const handleSendSOS = async (message: string) => {
    if (!room || !currentPlayer) return;
    await api.triggerSOS(room.code, currentPlayer.id, true, message);
  };

  const handleCancelSOS = async () => {
    if (!room || !currentPlayer) return;
    await api.triggerSOS(room.code, currentPlayer.id, false);
  };

  const handleShareInvite = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?join=${roomCode}`;
    if (navigator.share) {
      navigator.share({
        title: `Join Cahul Hunt (${roomCode})`,
        text: `Join our live GPS Hide & Seek game in Cahul! Room Code: ${roomCode}`,
        url: shareUrl,
      }).catch(() => {
        navigator.clipboard.writeText(shareUrl);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyGameCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Quick switch role / persona for easy testing on one device
  const handleQuickPersonaSwitch = (p: Player) => {
    setActivePlayerId(p.id);
    setActiveRole(p.role);
    if (p.role === 'ADMIN') setActiveTab('ADMIN');
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* YOUTUBE DRAMATIC BROADCAST OVERLAY */}
      {room && room.activeBanners && (
        <YouTubeOverlay
          banners={room.activeBanners}
          onDismiss={(id) => {
            setRoom({
              ...room,
              activeBanners: room.activeBanners.filter((b) => b.id !== id),
            });
          }}
        />
      )}

      {/* CREATE GAME MODAL */}
      <CreateGameModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateGameSubmit}
      />

      {/* 1. HOME SCREEN */}
      {screen === 'HOME' && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto w-full my-auto animate-in fade-in">
          {/* PWA Phone Install Prompt */}
          <div className="w-full mb-4">
            <PWAInstallBanner />
          </div>

          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center text-amber-500 text-4xl shadow-2xl mb-4">
            🎯
          </div>

          <span className="text-xs font-mono font-bold tracking-[0.25em] text-amber-400 uppercase">
            CAHUL • MOLDOVA
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mt-1 mb-2 font-display">
            CAHUL HUNT
          </h1>

          <p className="text-base text-neutral-400 font-medium mb-8">
            Hide. Complete. Survive.
          </p>

          <div className="w-full space-y-4 bg-neutral-900/80 border border-neutral-800 p-6 rounded-3xl shadow-2xl backdrop-blur-md">
            <div>
              <label className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 block mb-2 font-bold">
                ENTER GAME CODE
              </label>
              <input
                id="input-game-code"
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="C4HUL7"
                maxLength={10}
                className="w-full text-center text-2xl font-mono font-black tracking-widest py-3 px-4 rounded-2xl bg-neutral-950 border border-neutral-700 text-amber-400 focus:outline-none focus:border-amber-500 uppercase transition shadow-inner"
              />
            </div>

            <button
              id="btn-join-game"
              onClick={handleJoinClick}
              className="w-full py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-base tracking-wider uppercase shadow-xl shadow-amber-500/20 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <span>JOIN GAME</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-neutral-900 px-3 text-neutral-500 font-mono">OR</span>
              </div>
            </div>

            <button
              id="btn-create-game"
              onClick={handleOpenCreateModal}
              className="w-full py-3.5 px-6 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-sm tracking-wider uppercase transition active:scale-95 border border-neutral-700 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>CREATE NEW GAME ROOM</span>
            </button>
          </div>

          {/* ACTIVE PUBLIC ROOMS LIST */}
          {availableRooms.length > 0 && (
            <div className="w-full mt-6 text-left">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-neutral-400 mb-2 px-1">
                <span>ACTIVE ROOMS IN CAHUL</span>
                <button
                  onClick={loadRoomsList}
                  className="text-amber-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {availableRooms.map((r) => (
                  <div
                    key={r.code}
                    className="p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-amber-400 text-sm">{r.code}</span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                            r.status === 'ACTIVE'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                        <span>👥 {r.playerCount} players</span>
                        <span>•</span>
                        <span>📍 {r.boundaryName}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDirectRoomJoin(r.code)}
                      className="py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500 hover:text-black text-amber-400 font-bold text-xs transition"
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center gap-4 text-xs text-neutral-500">
            <button onClick={() => setShowRulesModal(true)} className="hover:text-amber-400 transition underline">
              Game Rules
            </button>
            <span>•</span>
            <button
              onClick={() => {
                setRoomCode('C4HUL7');
                setScreen('GAME');
              }}
              className="hover:text-amber-400 transition underline"
            >
              Instant Demo Preview
            </button>
          </div>
        </main>
      )}

      {/* 2. PLAYER REGISTRATION SCREEN */}
      {screen === 'REGISTER' && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full my-auto animate-in fade-in">
          {/* PWA Phone Install Prompt */}
          <div className="w-full mb-3">
            <PWAInstallBanner />
          </div>

          <div className="w-full bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5 backdrop-blur-xl">
            <div className="text-center">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase">
                ROOM: {roomCode}
              </span>
              <h2 className="text-2xl font-black text-white font-display mt-0.5">
                CREATE YOUR PLAYER
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Customize your profile for the Cahul competition.
              </p>
            </div>

            <div className="space-y-4 text-left">
              <div>
                <label className="text-xs font-mono font-bold text-neutral-400 block mb-1">
                  NAME:
                </label>
                <input
                  id="input-player-name"
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="David"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-medium focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="text-xs font-mono font-bold text-neutral-400 block mb-1">
                  NICKNAME / CALLSIGN:
                </label>
                <input
                  id="input-player-nickname"
                  type="text"
                  value={regNickname}
                  onChange={(e) => setRegNickname(e.target.value.toUpperCase())}
                  placeholder="DAVE"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-500 transition uppercase"
                />
              </div>

              <div>
                <label className="text-xs font-mono font-bold text-neutral-400 block mb-1.5">
                  CHOOSE AVATAR:
                </label>
                <div className="flex flex-wrap gap-2">
                  {['🦁', '🐺', '🦅', '🦊', '🐻', '🎯', '👤', '👑', '⚡'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setRegAvatar(emoji)}
                      className={`w-11 h-11 rounded-2xl text-xl flex items-center justify-center transition border ${
                        regAvatar === emoji
                          ? 'bg-amber-500/20 border-amber-500 scale-110 shadow-lg'
                          : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-mono font-bold text-neutral-400 block mb-1">
                  OPTIONAL TEAM NAME:
                </label>
                <input
                  type="text"
                  value={regTeam}
                  onChange={(e) => setRegTeam(e.target.value)}
                  placeholder="Cahul Hunters"
                  className="w-full px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 text-sm focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              <div>
                <label className="text-xs font-mono font-bold text-neutral-400 block mb-1.5">
                  GAME ROLE:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRegRole('HIDER')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      regRole === 'HIDER'
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <span>🏃</span>
                    <span>HIDER (FUGAR)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRegRole('SEEKER')}
                    className={`p-3 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      regRole === 'SEEKER'
                        ? 'bg-rose-950 border-rose-500 text-rose-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <span>🎯</span>
                    <span>SEEKER (CĂUTĂTOR)</span>
                  </button>
                </div>
              </div>

              {/* Permissions Checklist from Prompt Section 2 */}
              <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 text-xs space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase">
                  <span className="text-neutral-400">REQUIRED SENSOR PERMISSIONS:</span>
                  {gpsStatus === 'active' ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> GPS READY
                    </span>
                  ) : (
                    <span className="text-amber-400">LOCATION REQUIRED</span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={requestGpsPermission}
                    className={`p-2 rounded-xl border flex items-center justify-between transition text-left ${
                      gpsStatus === 'active'
                        ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300'
                        : gpsStatus === 'denied'
                        ? 'bg-rose-950/30 border-rose-500/50 text-rose-300'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-amber-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 shrink-0" />
                      <span>GPS Location</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/40">
                      {gpsStatus === 'active' ? `±${realGpsLocation?.accuracy || 5}m` : 'Allow'}
                    </span>
                  </button>

                  <div className="p-2 rounded-xl border border-neutral-800 bg-neutral-900/50 flex items-center justify-between text-neutral-300">
                    <span className="flex items-center gap-1.5">📷 Camera & Video</span>
                    <span className="text-[10px] font-mono text-neutral-500">Auto</span>
                  </div>

                  <div className="p-2 rounded-xl border border-neutral-800 bg-neutral-900/50 flex items-center justify-between text-neutral-300">
                    <span className="flex items-center gap-1.5">🖼️ Photos Storage</span>
                    <span className="text-[10px] font-mono text-neutral-500">Auto</span>
                  </div>

                  <div className="p-2 rounded-xl border border-neutral-800 bg-neutral-900/50 flex items-center justify-between text-neutral-300">
                    <span className="flex items-center gap-1.5">🔔 Notifications</span>
                    <span className="text-[10px] font-mono text-neutral-500">Auto</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              id="btn-confirm-registration"
              onClick={() => handleCompleteRegistration(false)}
              className="w-full py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm tracking-wider uppercase shadow-xl shadow-amber-500/20 transition active:scale-95"
            >
              [ READY ]
            </button>
          </div>
        </main>
      )}

      {/* 3. WAITING ROOM / LOBBY SCREEN */}
      {screen === 'LOBBY' && room && (
        <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-lg mx-auto w-full my-auto animate-in fade-in">
          {/* PWA Phone Install Prompt */}
          <div className="w-full mb-3">
            <PWAInstallBanner />
          </div>

          <div className="w-full bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                WAITING ROOM
              </span>
              <button
                onClick={handleLeaveCurrentRoom}
                className="text-xs text-neutral-400 hover:text-red-400 flex items-center gap-1 transition"
                title="Leave room"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Leave</span>
              </button>
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-black text-white font-display mt-0.5">
                CAHUL HUNT LOBBY
              </h2>

              {/* Game code with copy and share */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <div className="inline-flex items-center gap-2 bg-neutral-950 px-4 py-2 rounded-2xl border border-neutral-800">
                  <span className="text-xs font-mono text-neutral-400">ROOM:</span>
                  <span className="text-lg font-mono font-black text-amber-400 tracking-wider">
                    {room.code}
                  </span>
                  <button
                    id="btn-copy-code-lobby"
                    onClick={handleCopyGameCode}
                    className="p-1 text-neutral-400 hover:text-white transition"
                    title="Copy Game Code"
                  >
                    {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  onClick={handleShareInvite}
                  className="px-3.5 py-2 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Invite Link</span>
                </button>
              </div>

              {copiedCode && (
                <div className="text-[11px] text-emerald-400 font-mono mt-1 animate-in fade-in">
                  ✓ Link copied to clipboard! Send to friends to join.
                </div>
              )}
            </div>

            {/* Live GPS Readiness Indicator in Lobby */}
            <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between transition ${
              gpsStatus === 'active'
                ? 'bg-emerald-950/20 border-emerald-500/40'
                : 'bg-amber-950/20 border-amber-500/40'
            }`}>
              <div className="flex items-center gap-2.5">
                <Navigation className={`w-4 h-4 ${gpsStatus === 'active' ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`} />
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>REAL-TIME GPS:</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold uppercase ${
                      gpsStatus === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {gpsStatus === 'active' ? 'READY' : 'REQUIRED'}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    {gpsStatus === 'active' && realGpsLocation
                      ? `Locked at ${realGpsLocation.lat.toFixed(4)}, ${realGpsLocation.lng.toFixed(4)} (±${realGpsLocation.accuracy}m accuracy)`
                      : 'Enable location before the competition starts'}
                  </div>
                </div>
              </div>

              {gpsStatus !== 'active' ? (
                <button
                  onClick={requestGpsPermission}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-xl transition shadow active:scale-95"
                >
                  ALLOW GPS
                </button>
              ) : (
                <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Ready
                </span>
              )}
            </div>

            {/* Role switch for current player */}
            {currentPlayer && (
              <div className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800">
                <div className="text-[10px] font-mono font-bold text-neutral-400 uppercase mb-2 flex items-center justify-between">
                  <span>YOUR ROLE: {currentPlayer.role}</span>
                  <span className="text-amber-400">Tap to switch</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSwitchMyRole('HIDER')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      currentPlayer.role === 'HIDER'
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <span>🏃</span>
                    <span>Play as Hider</span>
                  </button>

                  <button
                    onClick={() => handleSwitchMyRole('SEEKER')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      currentPlayer.role === 'SEEKER'
                        ? 'bg-rose-950 border-rose-500 text-rose-300'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <span>🎯</span>
                    <span>Play as Seeker</span>
                  </button>
                </div>
              </div>
            )}

            {/* Players List */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-neutral-400 mb-2 font-bold">
                <span>PLAYERS IN ROOM ({Object.keys(room.players).length})</span>
                <button
                  onClick={handleAddPracticeBot}
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-sans transition"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>+ Add AI Bot</span>
                </button>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {Object.values(room.players).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-neutral-950 border border-neutral-800/80"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{p.avatar}</span>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {p.role === 'SEEKER' && (
                            <span className="text-[10px] text-rose-400 font-mono font-bold bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-900">
                              SEEKER
                            </span>
                          )}
                          {p.role === 'HIDER' && (
                            <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-900">
                              HIDER
                            </span>
                          )}
                          {p.id === activePlayerId && (
                            <span className="text-[10px] text-amber-400 font-bold">(YOU)</span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-400 font-mono">@{p.nickname}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs font-mono font-bold text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> READY
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center text-xs text-neutral-500 font-mono italic">
              Share the room code or invite link with friends to join live from their phones.
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                id="btn-lobby-start-game"
                onClick={handleStartGameFromLobby}
                className="w-full py-4 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm tracking-wider uppercase shadow-xl shadow-amber-500/20 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>START GAME (ARENA)</span>
              </button>
            </div>
          </div>
        </main>
      )}

      {/* 4. MAIN ACTIVE GAME VIEW */}
      {screen === 'GAME' && room && (
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* TOP GLOBAL GAME STATUS HUD */}
          <header className="bg-neutral-900/95 border-b border-neutral-800 px-4 py-2.5 flex items-center justify-between gap-2 shrink-0 z-40 backdrop-blur-md">
            {/* Title + Room Code */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-lg">🎯</span>
                <span className="font-black text-white tracking-wider font-display text-sm sm:text-base">
                  CAHUL HUNT
                </span>
              </div>
              <button
                onClick={handleCopyGameCode}
                className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-amber-400 hover:border-neutral-700 transition"
                title="Click to copy room code"
              >
                <span>{room.code}</span>
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-neutral-400" />}
              </button>
            </div>

            {/* Synchronized Timer (Prompt Section 21) */}
            <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-800 font-mono shadow-inner">
              <span className="text-[10px] text-neutral-500 hidden xs:inline uppercase">TIME LEFT:</span>
              <span className="text-sm sm:text-base font-extrabold text-amber-400 tracking-wider">
                {formatTimeRemaining(room.remainingSeconds)}
              </span>
            </div>

            {/* GPS Telemetry Indicator */}
            <GpsPermissionBanner
              compact
              status={gpsStatus}
              errorMessage={gpsError}
              location={realGpsLocation}
              mode={gpsMode}
              onRequestPermission={requestGpsPermission}
              onSwitchMode={switchGpsMode}
              onCalibrate={calibrateOriginToCahul}
            />

            {/* Quick Actions & Role Switcher */}
            <div className="flex items-center gap-1.5">
              {/* SOS button */}
              <button
                id="btn-safety-sos-hud"
                onClick={() => setShowSOSModal(true)}
                className="px-2.5 py-1 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-300 text-xs font-black flex items-center gap-1 transition animate-pulse"
                title="Emergency SOS"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">SOS</span>
              </button>

              {/* Stats button */}
              <button
                id="btn-stats-hud"
                onClick={() => setShowStatsModal(true)}
                className="p-1.5 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white transition"
                title="Results & Stats"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
              </button>

              {/* Rules button */}
              <button
                id="btn-rules-hud"
                onClick={() => setShowRulesModal(true)}
                className="p-1.5 rounded-xl bg-neutral-800 text-neutral-300 hover:text-white transition"
                title="Official Rules"
              >
                <HelpCircle className="w-4 h-4" />
              </button>

              {/* Share Invite button */}
              <button
                onClick={handleShareInvite}
                className="hidden sm:flex items-center gap-1 p-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 transition text-xs font-bold"
                title="Share Game Invite Link"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Invite</span>
              </button>

              {/* Leave Game button */}
              <button
                onClick={handleLeaveCurrentRoom}
                className="p-1.5 rounded-xl bg-neutral-800 hover:bg-red-950 text-neutral-400 hover:text-red-400 border border-transparent hover:border-red-800 transition"
                title="Exit Game to Main Menu"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>

              {/* Persona switcher dropdown for testing all perspectives */}
              <select
                value={activePlayerId}
                onChange={(e) => {
                  const targetId = e.target.value;
                  if (targetId === 'admin') {
                    setActiveRole('ADMIN');
                    setActiveTab('ADMIN');
                  } else {
                    const p = room.players[targetId];
                    if (p) {
                      setActivePlayerId(p.id);
                      setActiveRole(p.role);
                      if (activeTab === 'ADMIN') setActiveTab('MAP');
                    }
                  }
                }}
                className="px-2 py-1 rounded-xl bg-neutral-800 border border-neutral-700 text-xs text-amber-400 font-mono font-bold max-w-[120px] sm:max-w-[150px]"
                title="Switch Perspective for Testing"
              >
                <option value="admin">👑 GM (Admin)</option>
                {Object.values(room.players).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.avatar} {p.name} ({p.role})
                  </option>
                ))}
              </select>
            </div>
          </header>

          {/* MAIN CONTENT AREA */}
          <main className="flex-1 relative overflow-hidden flex flex-col">
            {/* TAB: MAP */}
            {activeTab === 'MAP' && (
              <div className="relative w-full h-full flex flex-col">
                {/* Global GPS Tracking & Permission Banner */}
                <GpsPermissionBanner
                  status={gpsStatus}
                  errorMessage={gpsError}
                  location={realGpsLocation}
                  mode={gpsMode}
                  onRequestPermission={requestGpsPermission}
                  onSwitchMode={switchGpsMode}
                  onCalibrate={calibrateOriginToCahul}
                />

                {/* Boundary warning banner if player is outside tolerance */}
                {currentPlayer && (
                  <BoundaryWarningBanner
                    player={currentPlayer}
                    onReturnQuickTest={() => {
                      handleUpdateLocation(CAHUL_CENTER.lat, CAHUL_CENTER.lng, 4);
                    }}
                  />
                )}

                {/* Map View Header Selector & Container */}
                <div className="flex-1 w-full relative">
                  {/* Engine Switcher Float Button */}
                  <div className="absolute top-14 left-3 z-450 flex items-center gap-1 bg-neutral-900/90 backdrop-blur-md p-1 rounded-xl border border-neutral-800 shadow-xl pointer-events-auto">
                    <button
                      id="btn-engine-google"
                      onClick={() => setMapEngine('google')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1 ${
                        mapEngine === 'google'
                          ? 'bg-amber-500 text-black shadow'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <span>🗺️ Google Maps</span>
                    </button>
                    <button
                      id="btn-engine-leaflet"
                      onClick={() => setMapEngine('leaflet')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1 ${
                        mapEngine === 'leaflet'
                          ? 'bg-amber-500 text-black shadow'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <span>🌐 OSM Vector</span>
                    </button>
                  </div>

                  {mapEngine === 'google' ? (
                    <GoogleCahulMap
                      room={room}
                      activePlayerId={activePlayerId}
                      role={activeRole}
                      onUpdateLocation={handleUpdateLocation}
                      onSelectPlayer={(p) => {
                        if (activeRole === 'ADMIN') {
                          setSelectedInspectPlayer(p);
                        }
                      }}
                      onSwitchToLeaflet={() => setMapEngine('leaflet')}
                      gpsActive={gpsStatus === 'active'}
                      onRequestGPS={requestGpsPermission}
                      realLocation={realGpsLocation}
                    />
                  ) : (
                    <CahulMap
                      room={room}
                      activePlayerId={activePlayerId}
                      role={activeRole}
                      onUpdateLocation={handleUpdateLocation}
                      onSelectPlayer={(p) => {
                        if (activeRole === 'ADMIN') {
                          setSelectedInspectPlayer(p);
                        }
                      }}
                      gpsActive={gpsStatus === 'active'}
                      onRequestGPS={requestGpsPermission}
                      realLocation={realGpsLocation}
                    />
                  )}

                  {/* Seeker Controls Floating Card (if active role is Seeker) */}
                  {activeRole === 'SEEKER' && currentPlayer && (
                    <div className="absolute top-14 right-3 z-450 max-w-xs w-full pointer-events-auto">
                      <SeekerControl
                        room={room}
                        activeSeekerPlayer={currentPlayer}
                        onUseReveal={handleUseSeekerReveal}
                      />
                    </div>
                  )}

                  {/* HIDER TACTICAL CONTROLS BAR (Prompt Section 6, 7, 8) */}
                  {activeRole === 'HIDER' && currentPlayer && (
                    <div className="absolute top-14 right-3 z-450 flex flex-col gap-2 pointer-events-auto">
                      {/* Ghost Mode Button (Section 7) */}
                      <button
                        id="btn-toggle-ghost-mode"
                        onClick={handleToggleGhostMode}
                        className={`px-3.5 py-2 rounded-2xl text-xs font-black tracking-wider uppercase shadow-xl transition flex items-center gap-2 border ${
                          currentPlayer.isGhostMode
                            ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500 ring-2 ring-cyan-500/30'
                            : 'bg-neutral-900/90 text-neutral-400 border-neutral-700 hover:text-white'
                        }`}
                      >
                        {currentPlayer.isGhostMode ? <EyeOff className="w-4 h-4 text-cyan-400" /> : <Eye className="w-4 h-4" />}
                        <span>{currentPlayer.isGhostMode ? 'GHOST MODE ON' : 'GHOST MODE'}</span>
                      </button>

                      {/* Voluntary Reveal / "SHOW ME" (Section 8) */}
                      <button
                        id="btn-toggle-show-me"
                        onClick={handleToggleShowMe}
                        className={`px-3.5 py-2 rounded-2xl text-xs font-black tracking-wider uppercase shadow-xl transition flex items-center gap-2 border ${
                          currentPlayer.isVoluntarilyVisible
                            ? 'bg-purple-950/90 text-purple-300 border-purple-500 ring-2 ring-purple-500/30 animate-pulse'
                            : 'bg-neutral-900/90 text-neutral-400 border-neutral-700 hover:text-white'
                        }`}
                      >
                        <Radio className="w-4 h-4" />
                        <span>{currentPlayer.isVoluntarilyVisible ? 'YOU ARE VISIBLE' : 'SHOW ME'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: BINGO (5x5 Board from uploaded image) */}
            {activeTab === 'BINGO' && currentPlayer && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-neutral-950">
                <BingoBoard
                  room={room}
                  player={currentPlayer}
                  onSubmitProof={handleSubmitBingoProof}
                />
              </div>
            )}

            {/* TAB: GAME EVENTS & LOG */}
            {activeTab === 'EVENTS' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-neutral-950">
                <EventsLogView events={room.events} />
              </div>
            )}

            {/* TAB: GAME MASTER CONTROL CENTER */}
            {activeTab === 'ADMIN' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-neutral-950">
                <GameMasterControl
                  room={room}
                  onAdminAction={handleAdminAction}
                  onReviewBingo={handleReviewBingo}
                  onSelectPlayerForInspection={(p) => setSelectedInspectPlayer(p)}
                  selectedPlayer={selectedInspectPlayer}
                />
              </div>
            )}
          </main>

          {/* 33. MAIN PLAYER BOTTOM NAVIGATION */}
          <nav className="bg-neutral-900/95 border-t border-neutral-800 px-6 py-2 shrink-0 z-40 backdrop-blur-md">
            <div className="max-w-md mx-auto flex items-center justify-around">
              <button
                id="nav-tab-map"
                onClick={() => setActiveTab('MAP')}
                className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
                  activeTab === 'MAP'
                    ? 'text-amber-400 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <MapIcon className="w-5 h-5 mb-0.5" />
                <span className="text-[11px] font-mono uppercase">MAP</span>
              </button>

              <button
                id="nav-tab-bingo"
                onClick={() => setActiveTab('BINGO')}
                className={`flex flex-col items-center py-1 px-3 rounded-xl transition relative ${
                  activeTab === 'BINGO'
                    ? 'text-amber-400 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Target className="w-5 h-5 mb-0.5" />
                <span className="text-[11px] font-mono uppercase">BINGO</span>
                {currentPlayer?.bingo && currentPlayer.bingo.completedCount > 0 && (
                  <span className="absolute top-0 right-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[9px] font-bold">
                    {currentPlayer.bingo.completedCount}
                  </span>
                )}
              </button>

              <button
                id="nav-tab-events"
                onClick={() => setActiveTab('EVENTS')}
                className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
                  activeTab === 'EVENTS'
                    ? 'text-amber-400 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <Users className="w-5 h-5 mb-0.5" />
                <span className="text-[11px] font-mono uppercase">EVENTS</span>
              </button>

              {activeRole === 'ADMIN' && (
                <button
                  id="nav-tab-admin"
                  onClick={() => setActiveTab('ADMIN')}
                  className={`flex flex-col items-center py-1 px-3 rounded-xl transition ${
                    activeTab === 'ADMIN'
                      ? 'text-amber-400 font-bold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Shield className="w-5 h-5 mb-0.5" />
                  <span className="text-[11px] font-mono uppercase">GM PANEL</span>
                </button>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* INSPECTION DRAWER FOR GAME MASTER */}
      {selectedInspectPlayer && (
        <PlayerInspectionDrawer
          player={selectedInspectPlayer}
          onClose={() => setSelectedInspectPlayer(null)}
          onEliminate={(pId) => {
            handleAdminAction('ELIMINATE_PLAYER', { targetPlayerId: pId });
            setSelectedInspectPlayer(null);
          }}
          onRevealPlayer={(pId) => {
            handleAdminAction('TRIGGER_BANNER', {
              title: `🎯 ${selectedInspectPlayer.name.toUpperCase()} REVEALED!`,
              subtitle: 'Game Master exposed position on tactical map',
              type: 'reveal',
            });
            handleUseSeekerReveal(pId);
            setSelectedInspectPlayer(null);
          }}
        />
      )}

      {/* RULES MODAL */}
      {showRulesModal && (
        <RulesModal onAccept={() => setShowRulesModal(false)} />
      )}

      {/* RESULTS & STATS MODAL */}
      {showStatsModal && room && (
        <GameStatsModal room={room} onClose={() => setShowStatsModal(false)} />
      )}

      {/* EMERGENCY SOS MODAL */}
      {showSOSModal && currentPlayer && (
        <SafetySOSModal
          player={currentPlayer}
          onSendSOS={handleSendSOS}
          onCancelSOS={handleCancelSOS}
          onClose={() => setShowSOSModal(false)}
        />
      )}

      {/* SENSOR & LOCATION PERMISSIONS MODAL */}
      <PermissionsModal
        isOpen={showPermissionsModal}
        gpsStatus={gpsStatus}
        onRequestGPS={requestGpsPermission}
        onComplete={() => {
          setShowPermissionsModal(false);
          setPermissionsGranted(true);
          handleCompleteRegistration(true);
        }}
      />
    </div>
  );
}
