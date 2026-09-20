/**
 * CAHUL HUNT - Real-life GPS Hide & Seek + Bingo Game Types
 */

export type GameStatus = 'WAITING' | 'COUNTDOWN' | 'ACTIVE' | 'PAUSED' | 'ENDED';

export type PlayerRole = 'HIDER' | 'SEEKER' | 'ADMIN';

export type PlayerStatus =
  | 'WAITING'
  | 'HIDING'
  | 'VISIBLE'
  | 'WARNING'
  | 'REVEALED'
  | 'ELIMINATED'
  | 'BINGO'
  | 'WINNER';

export interface GPSLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
}

export interface BingoChallenge {
  id: number;
  number: number;
  titleRo: string;
  titleEn: string;
  descRo: string;
  descEn: string;
  requirementsRo: string;
  requirementsEn: string;
  proofType: 'photo' | 'video' | 'text';
  category: 'social' | 'stealth' | 'physical' | 'creative' | 'scavenger';
  badgeIcon: string;
}

export interface BingoSquareSubmission {
  challengeId: number;
  status: 'UNTOUCHED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  proofUrl?: string;
  proofNote?: string;
  submittedAt?: number;
  reviewedAt?: number;
  feedback?: string;
}

export interface BingoState {
  submissions: Record<number, BingoSquareSubmission>;
  completedCount: number;
  linesCount: number;
  hasWonBingo: boolean;
  bingoTimestamp?: number;
}

export interface PlayerTimelineEntry {
  id: string;
  timestamp: number;
  timeStr: string;
  text: string;
  type: 'join' | 'ghost' | 'challenge' | 'warning' | 'return' | 'reveal' | 'elimination' | 'bingo' | 'sos';
}

export interface SOSAlert {
  active: boolean;
  message: string;
  timestamp: number;
  location: GPSLocation;
}

export interface Player {
  id: string;
  name: string;
  nickname: string;
  avatar: string;
  team?: string;
  role: PlayerRole;
  status: PlayerStatus;
  isReady: boolean;
  location: GPSLocation;
  isGhostMode: boolean;
  isVoluntarilyVisible: boolean;
  warningCountdown: number | null; // 10s down to 0
  revealedUntil: number | null; // epoch timestamp
  revealsUsedOnHim: number;
  timeAliveSeconds: number;
  bingo: BingoState;
  joinedAt: number;
  sosAlert?: SOSAlert | null;
  timeline: PlayerTimelineEntry[];
}

export interface SeekerState {
  playerId: string | null;
  revealsTotal: number;
  revealsUsed: number;
  activeReveal: {
    targetPlayerId: string;
    targetName: string;
    expiresAt: number; // timestamp
    durationSeconds: number;
  } | null;
}

export interface BoundaryPolygon {
  name: string;
  coordinates: [number, number][]; // [lat, lng] tuples
  bufferMeters: number; // e.g. 25m tolerance
}

export interface GameEvent {
  id: string;
  timestamp: number;
  timeStr: string;
  type:
    | 'GHOST_MODE'
    | 'CHALLENGE_SUBMITTED'
    | 'CHALLENGE_APPROVED'
    | 'CHALLENGE_REJECTED'
    | 'BOUNDARY_WARNING'
    | 'BOUNDARY_RETURNED'
    | 'ELIMINATED'
    | 'REVEAL_USED'
    | 'REVEAL_EXPIRED'
    | 'VOLUNTARY_VISIBLE'
    | 'BINGO_ACHIEVED'
    | 'SOS_ALERT'
    | 'GAME_PAUSED'
    | 'GAME_RESUMED'
    | 'GAME_STARTED'
    | 'GAME_ENDED';
  text: string;
  playerId?: string;
  playerName?: string;
  dramatic?: boolean;
}

export interface YouTubeBanner {
  id: string;
  title: string;
  subtitle?: string;
  type: 'warning' | 'reveal' | 'elimination' | 'bingo' | 'countdown' | 'sos' | 'info';
  timestamp: number;
}

export interface GameRoom {
  code: string;
  status: GameStatus;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
  initialDurationSeconds: number; // e.g. 90 mins (5400s)
  remainingSeconds: number;
  hidingGraceSeconds: number; // initial hiding period countdown
  boundary: BoundaryPolygon;
  players: Record<string, Player>;
  seeker: SeekerState;
  events: GameEvent[];
  activeBanners: YouTubeBanner[];
  isLobbyLocked: boolean;
  rulesAcceptedByGm: boolean;
}

export interface GameStatsSummary {
  gameLengthSeconds: number;
  totalPlayers: number;
  aliveCount: number;
  eliminatedCount: number;
  bingosCount: number;
  revealsUsed: number;
  boundaryViolations: number;
  challengesCompleted: number;
  winners: {
    rank: number;
    player: Player;
    bingoCompleted: number;
    survived: boolean;
  }[];
}
