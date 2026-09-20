import { GameRoom, Player } from '../types';

const API_BASE = '/api';

export async function fetchRoom(code: string): Promise<GameRoom | null> {
  try {
    const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(code)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Backend fetch failed, falling back to local storage', err);
    return null;
  }
}

export interface RoomSummary {
  code: string;
  status: string;
  playerCount: number;
  remainingSeconds: number;
  initialDurationSeconds: number;
  boundaryName: string;
  hasSeeker: boolean;
  createdAt: number;
}

export async function fetchRoomsList(): Promise<RoomSummary[]> {
  try {
    const res = await fetch(`${API_BASE}/rooms`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('Backend fetchRoomsList failed', err);
    return [];
  }
}

export async function createRoom(options?: {
  code?: string;
  durationMinutes?: number;
  withBots?: boolean;
}): Promise<GameRoom | null> {
  try {
    const res = await fetch(`${API_BASE}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {}),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Backend createRoom failed', err);
    return null;
  }
}

export async function joinRoom(
  code: string,
  payload: {
    name: string;
    nickname: string;
    avatar: string;
    team?: string;
    role?: string;
    existingPlayerId?: string;
  }
): Promise<{ player: Player; room: GameRoom } | null> {
  try {
    const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(code)}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Backend joinRoom failed', err);
    return null;
  }
}

export async function switchPlayerRole(code: string, playerId: string, role: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(code)}/switch-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, role }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function addBotPlayer(code: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(code)}/add-bot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function leaveRoom(code: string, playerId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(code)}/leave`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function updateLocation(code: string, playerId: string, lat: number, lng: number, accuracy?: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(code)}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, lat, lng, accuracy }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function toggleGhostMode(code: string, playerId: string, enable: boolean): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(code)}/ghost`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, enable }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function toggleShowMe(code: string, playerId: string, visible: boolean): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(code)}/show-me`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, visible }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function useSeekerReveal(code: string, targetPlayerId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(code)}/seeker-reveal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPlayerId, durationSeconds: 15 }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function submitBingoProof(code: string, playerId: string, challengeId: number, proofUrl: string, proofNote: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(code)}/bingo-submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, challengeId, proofUrl, proofNote }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function reviewBingoSubmission(code: string, playerId: string, challengeId: number, approved: boolean, feedback?: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(code)}/bingo-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, challengeId, approved, feedback }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendAdminAction(code: string, action: string, payload: any = {}): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(code)}/admin-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function triggerSOS(code: string, playerId: string, active: boolean, message?: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/rooms/${encodeURIComponent(code)}/sos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, active, message }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
