import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GameRoom, Player, GameEvent, YouTubeBanner } from './src/types';
import { CAHUL_DEFAULT_BOUNDARY, CAHUL_CENTER, checkBoundaryStatus, calculateBingoLines } from './src/utils/geo';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// In-memory store for game rooms
const rooms: Record<string, GameRoom> = {};

// SSE connections map: roomCode -> Set<express.Response>
const sseClients: Record<string, Set<express.Response>> = {};

function broadcastRoom(code: string) {
  const room = rooms[code];
  if (!room || !sseClients[code]) return;
  const data = `data: ${JSON.stringify(room)}\n\n`;
  for (const client of sseClients[code]) {
    try {
      client.write(data);
    } catch {
      sseClients[code].delete(client);
    }
  }
}

function addEvent(room: GameRoom, type: GameEvent['type'], text: string, playerId?: string, playerName?: string, dramatic?: boolean) {
  const now = Date.now();
  const d = new Date(now);
  const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  const event: GameEvent = {
    id: `evt-${now}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: now,
    timeStr,
    type,
    text,
    playerId,
    playerName,
    dramatic,
  };
  room.events.unshift(event);

  // If dramatic or key event, push YouTube broadcast banner
  if (dramatic || ['BOUNDARY_WARNING', 'ELIMINATED', 'REVEAL_USED', 'BINGO_ACHIEVED', 'SOS_ALERT'].includes(type)) {
    let bannerType: YouTubeBanner['type'] = 'info';
    let bannerTitle = text;
    let bannerSubtitle = playerName ? `Player: ${playerName}` : undefined;

    if (type === 'BOUNDARY_WARNING') {
      bannerType = 'warning';
      bannerTitle = '⚠️ PLAYER LEFT THE ZONE';
      bannerSubtitle = `${playerName} has 10 seconds to return!`;
    } else if (type === 'ELIMINATED') {
      bannerType = 'elimination';
      bannerTitle = '☠️ PLAYER ELIMINATED';
      bannerSubtitle = `${playerName} is OUT of the game`;
    } else if (type === 'REVEAL_USED') {
      bannerType = 'reveal';
      bannerTitle = '🎯 PLAYER REVEALED';
      bannerSubtitle = `Seeker exposed ${playerName}'s position for 15s`;
    } else if (type === 'BINGO_ACHIEVED') {
      bannerType = 'bingo';
      bannerTitle = '🏆 BINGO OBJECTIVE WON!';
      bannerSubtitle = `${playerName} completed BINGO!`;
    } else if (type === 'SOS_ALERT') {
      bannerType = 'sos';
      bannerTitle = '🚨 EMERGENCY SOS ALERT';
      bannerSubtitle = `Assistance needed for ${playerName}`;
    }

    const banner: YouTubeBanner = {
      id: `ban-${now}`,
      title: bannerTitle,
      subtitle: bannerSubtitle,
      type: bannerType,
      timestamp: now,
    };
    room.activeBanners.unshift(banner);
    if (room.activeBanners.length > 5) room.activeBanners.pop();
  }

  // Update player timeline if applicable
  if (playerId && room.players[playerId]) {
    let timelineType: any = 'join';
    if (type === 'GHOST_MODE') timelineType = 'ghost';
    else if (type.includes('CHALLENGE')) timelineType = 'challenge';
    else if (type === 'BOUNDARY_WARNING') timelineType = 'warning';
    else if (type === 'BOUNDARY_RETURNED') timelineType = 'return';
    else if (type === 'REVEAL_USED') timelineType = 'reveal';
    else if (type === 'ELIMINATED') timelineType = 'elimination';
    else if (type === 'BINGO_ACHIEVED') timelineType = 'bingo';
    else if (type === 'SOS_ALERT') timelineType = 'sos';

    room.players[playerId].timeline.unshift({
      id: `tl-${now}`,
      timestamp: now,
      timeStr,
      text,
      type: timelineType,
    });
  }
}

// Helper to seed standard game room
interface CreateRoomOptions {
  withBots?: boolean;
  durationMinutes?: number;
  hidingGraceSeconds?: number;
  boundary?: any;
}

function createInitialRoom(code = 'C4HUL7', options: CreateRoomOptions = { withBots: true }): GameRoom {
  const durationSec = Math.max(300, (options.durationMinutes || 90) * 60);
  const room: GameRoom = {
    code,
    status: 'WAITING',
    createdAt: Date.now(),
    startedAt: null,
    endedAt: null,
    initialDurationSeconds: durationSec,
    remainingSeconds: durationSec,
    hidingGraceSeconds: options.hidingGraceSeconds ?? 60,
    boundary: options.boundary || { ...CAHUL_DEFAULT_BOUNDARY },
    players: {},
    seeker: {
      playerId: options.withBots ? 'player-alex' : null,
      revealsTotal: 3,
      revealsUsed: 0,
      activeReveal: null,
    },
    events: [],
    activeBanners: [],
    isLobbyLocked: false,
    rulesAcceptedByGm: true,
  };

  // Only seed mock contestants if withBots is requested (e.g. for demo room C4HUL7)
  if (options.withBots) {
    const contestants: Array<{ id: string; name: string; nickname: string; avatar: string; role: any; latOffset: number; lngOffset: number }> = [
      { id: 'player-david', name: 'David', nickname: 'DAVE', avatar: '🦁', role: 'HIDER', latOffset: 0.002, lngOffset: -0.001 },
      { id: 'player-andrei', name: 'Andrei', nickname: 'ANDY', avatar: '🐺', role: 'HIDER', latOffset: -0.0015, lngOffset: 0.002 },
      { id: 'player-cristian', name: 'Cristian', nickname: 'CRIS', avatar: '🦅', role: 'HIDER', latOffset: 0.003, lngOffset: 0.001 },
      { id: 'player-daniel', name: 'Daniel', nickname: 'DAN', avatar: '🦊', role: 'HIDER', latOffset: -0.0025, lngOffset: -0.002 },
      { id: 'player-mihai', name: 'Mihai', nickname: 'MIKE', avatar: '🐻', role: 'HIDER', latOffset: 0.0005, lngOffset: -0.003 },
      { id: 'player-alex', name: 'Alex', nickname: 'HUNTER', avatar: '🎯', role: 'SEEKER', latOffset: -0.001, lngOffset: 0.0005 },
    ];

    for (const c of contestants) {
      const p: Player = {
        id: c.id,
        name: c.name,
        nickname: c.nickname,
        avatar: c.avatar,
        role: c.role,
        status: 'WAITING',
        isReady: true,
        location: {
          lat: CAHUL_CENTER.lat + c.latOffset,
          lng: CAHUL_CENTER.lng + c.lngOffset,
          accuracy: 8,
          timestamp: Date.now(),
        },
        isGhostMode: true,
        isVoluntarilyVisible: false,
        warningCountdown: null,
        revealedUntil: null,
        revealsUsedOnHim: 0,
        timeAliveSeconds: 0,
        bingo: {
          submissions: {},
          completedCount: 0,
          linesCount: 0,
          hasWonBingo: false,
        },
        joinedAt: Date.now(),
        timeline: [
          {
            id: `tl-join-${c.id}`,
            timestamp: Date.now(),
            timeStr: '14:00',
            text: `${c.name} joined the game lobby`,
            type: 'join',
          },
        ],
      };
      room.players[p.id] = p;
    }
  }

  addEvent(room, 'GAME_STARTED', `Game room ${code} created in Cahul, Moldova`, undefined, undefined, false);
  return room;
}

// Initialize default demo room C4HUL7 with bots
rooms['C4HUL7'] = createInitialRoom('C4HUL7', { withBots: true });

// Ticking game clock
setInterval(() => {
  const now = Date.now();
  for (const code in rooms) {
    const room = rooms[code];
    if (room.status === 'ACTIVE') {
      if (room.remainingSeconds > 0) {
        room.remainingSeconds -= 1;
      } else {
        room.status = 'ENDED';
        room.endedAt = now;
        addEvent(room, 'GAME_ENDED', 'Game Timer Expired! The Hunt is complete.', undefined, undefined, true);
        broadcastRoom(code);
        continue;
      }

      // Check reveal countdowns
      if (room.seeker.activeReveal) {
        if (now >= room.seeker.activeReveal.expiresAt) {
          const targetId = room.seeker.activeReveal.targetPlayerId;
          const target = room.players[targetId];
          room.seeker.activeReveal = null;
          if (target) {
            target.revealedUntil = null;
            if (target.status === 'REVEALED') {
              target.status = target.isGhostMode ? 'HIDING' : 'VISIBLE';
            }
            addEvent(room, 'REVEAL_EXPIRED', `${target.name}'s location is hidden again`, target.id, target.name);
          }
        }
      }

      // Check player warning countdowns (10s boundary exit)
      let stateChanged = false;
      let aliveHiders = 0;

      for (const pId in room.players) {
        const p = room.players[pId];
        if (p.role === 'HIDER' && p.status !== 'ELIMINATED') {
          aliveHiders++;
          p.timeAliveSeconds += 1;

          // Boundary verification
          const boundCheck = checkBoundaryStatus(p.location, room.boundary);
          if (boundCheck.status === 'OUTSIDE') {
            if (p.warningCountdown === null) {
              p.warningCountdown = 10;
              p.status = 'WARNING';
              addEvent(room, 'BOUNDARY_WARNING', `⚠️ ${p.name} left the game zone! 10 seconds to return!`, p.id, p.name, true);
              stateChanged = true;
            } else if (p.warningCountdown > 1) {
              p.warningCountdown -= 1;
              stateChanged = true;
            } else if (p.warningCountdown <= 1) {
              p.warningCountdown = 0;
              p.status = 'ELIMINATED';
              addEvent(room, 'ELIMINATED', `☠️ ${p.name} was ELIMINATED! Reason: Left game area`, p.id, p.name, true);
              stateChanged = true;
            }
          } else {
            // Player is SAFE or BUFFER
            if (p.warningCountdown !== null) {
              p.warningCountdown = null;
              p.status = p.revealedUntil && p.revealedUntil > now ? 'REVEALED' : (p.isGhostMode ? 'HIDING' : 'VISIBLE');
              addEvent(room, 'BOUNDARY_RETURNED', `🛡️ ${p.name} returned safely to the game zone`, p.id, p.name, false);
              stateChanged = true;
            }
          }
        }
      }

      // Broadcast if state changed or every 5 seconds for timer sync
      if (stateChanged || room.remainingSeconds % 5 === 0) {
        broadcastRoom(code);
      }
    }
  }
}, 1000);

// API ROUTES
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// List available rooms
app.get('/api/rooms', (req, res) => {
  const roomList = Object.values(rooms).map((r) => ({
    code: r.code,
    status: r.status,
    playerCount: Object.keys(r.players).length,
    remainingSeconds: r.remainingSeconds,
    initialDurationSeconds: r.initialDurationSeconds,
    boundaryName: r.boundary?.name || 'Cahul Central',
    hasSeeker: Boolean(r.seeker?.playerId && r.players[r.seeker.playerId]),
    createdAt: r.createdAt,
  }));
  res.json(roomList);
});

// Get room details
app.get('/api/rooms/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms[code];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(room);
});

// SSE Live stream for a room
app.get('/api/rooms/:code/stream', (req, res) => {
  const code = req.params.code.toUpperCase();
  let room = rooms[code];
  if (!room) {
    // If not found, create empty room for real players
    room = createInitialRoom(code, { withBots: false });
    rooms[code] = room;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  if (!sseClients[code]) sseClients[code] = new Set();
  sseClients[code].add(res);

  // Send initial state immediately
  res.write(`data: ${JSON.stringify(room)}\n\n`);

  req.on('close', () => {
    sseClients[code]?.delete(res);
  });
});

// Create a new room
app.post('/api/rooms', (req, res) => {
  const customCode = req.body.code ? req.body.code.trim().toUpperCase() : `CAHUL${Math.floor(10 + Math.random() * 90)}`;
  const durationMinutes = Number(req.body.durationMinutes) || 90;
  const withBots = Boolean(req.body.withBots);

  // Create or reset room
  rooms[customCode] = createInitialRoom(customCode, {
    withBots,
    durationMinutes,
  });

  broadcastRoom(customCode);
  res.json(rooms[customCode]);
});

// Join room as player (Real Player or Spectator)
app.post('/api/rooms/:code/join', (req, res) => {
  const code = req.params.code.toUpperCase();
  let room = rooms[code];
  if (!room) {
    room = createInitialRoom(code, { withBots: false });
    rooms[code] = room;
  }

  const { name, nickname, avatar, team, role, existingPlayerId } = req.body;
  const playerId = existingPlayerId && room.players[existingPlayerId] 
    ? existingPlayerId 
    : `player-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  
  const assignedRole: any = role || (Object.values(room.players).some(p => p.role === 'SEEKER') ? 'HIDER' : 'SEEKER');

  const existing = room.players[playerId];
  const newPlayer: Player = {
    id: playerId,
    name: name?.trim() || existing?.name || 'Player',
    nickname: nickname?.trim() || existing?.nickname || name?.toUpperCase() || 'PLAYER',
    avatar: avatar || existing?.avatar || '👤',
    team: team?.trim() || existing?.team || '',
    role: assignedRole,
    status: room.status === 'ACTIVE' ? (assignedRole === 'SEEKER' ? 'VISIBLE' : 'HIDING') : 'WAITING',
    isReady: true,
    location: existing?.location || {
      lat: CAHUL_CENTER.lat + (Math.random() - 0.5) * 0.003,
      lng: CAHUL_CENTER.lng + (Math.random() - 0.5) * 0.003,
      accuracy: 6,
      timestamp: Date.now(),
    },
    isGhostMode: existing ? existing.isGhostMode : true,
    isVoluntarilyVisible: existing ? existing.isVoluntarilyVisible : false,
    warningCountdown: null,
    revealedUntil: null,
    revealsUsedOnHim: 0,
    timeAliveSeconds: existing ? existing.timeAliveSeconds : 0,
    bingo: existing ? existing.bingo : {
      submissions: {},
      completedCount: 0,
      linesCount: 0,
      hasWonBingo: false,
    },
    joinedAt: existing ? existing.joinedAt : Date.now(),
    timeline: existing ? existing.timeline : [
      {
        id: `tl-join-${Date.now()}`,
        timestamp: Date.now(),
        timeStr: new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
        text: `${name || 'Player'} joined Cahul Hunt (${assignedRole})`,
        type: 'join',
      },
    ],
  };

  room.players[playerId] = newPlayer;

  // If Seeker role was chosen, register as room's active seeker
  if (assignedRole === 'SEEKER') {
    room.seeker.playerId = playerId;
  }

  addEvent(room, 'GAME_STARTED', `${newPlayer.name} joined as ${newPlayer.role}`, newPlayer.id, newPlayer.name);
  broadcastRoom(code);
  res.json({ player: newPlayer, room });
});

// Switch role (Hider <-> Seeker <-> Admin)
app.post('/api/rooms/:code/switch-role', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms[code];
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const { playerId, role } = req.body;
  const player = room.players[playerId];
  if (!player) return res.status(404).json({ error: 'Player not found' });

  player.role = role;
  if (role === 'SEEKER') {
    room.seeker.playerId = player.id;
    if (room.status === 'ACTIVE') player.status = 'VISIBLE';
  } else if (role === 'HIDER') {
    if (room.seeker.playerId === player.id) {
      // Find another seeker if any
      const otherSeeker = Object.values(room.players).find(p => p.id !== player.id && p.role === 'SEEKER');
      room.seeker.playerId = otherSeeker ? otherSeeker.id : null;
    }
    if (room.status === 'ACTIVE') player.status = player.isGhostMode ? 'HIDING' : 'VISIBLE';
  }

  addEvent(room, 'GAME_STARTED', `${player.name} switched role to ${role}`, player.id, player.name);
  broadcastRoom(code);
  res.json({ success: true, player, room });
});

// Add a simulated practice Bot to room
app.post('/api/rooms/:code/add-bot', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms[code];
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const botNames = [
    { name: 'David (Bot)', nickname: 'DAVE', avatar: '🦁', role: 'HIDER' },
    { name: 'Andrei (Bot)', nickname: 'ANDY', avatar: '🐺', role: 'HIDER' },
    { name: 'Cristian (Bot)', nickname: 'CRIS', avatar: '🦅', role: 'HIDER' },
    { name: 'Alex Hunter (Bot)', nickname: 'SEEKER-AI', avatar: '🎯', role: 'SEEKER' },
    { name: 'Daniel (Bot)', nickname: 'DAN', avatar: '🦊', role: 'HIDER' },
  ];

  // Pick one not yet added
  const existingNicknames = new Set(Object.values(room.players).map(p => p.nickname));
  const candidate = botNames.find(b => !existingNicknames.has(b.nickname)) || {
    name: `Runner ${Math.floor(10 + Math.random() * 90)} (Bot)`,
    nickname: `BOT-${Math.floor(100 + Math.random() * 900)}`,
    avatar: '🤖',
    role: 'HIDER' as const,
  };

  const botId = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const botPlayer: Player = {
    id: botId,
    name: candidate.name,
    nickname: candidate.nickname,
    avatar: candidate.avatar,
    role: candidate.role as any,
    status: room.status === 'ACTIVE' ? (candidate.role === 'SEEKER' ? 'VISIBLE' : 'HIDING') : 'WAITING',
    isReady: true,
    location: {
      lat: CAHUL_CENTER.lat + (Math.random() - 0.5) * 0.004,
      lng: CAHUL_CENTER.lng + (Math.random() - 0.5) * 0.004,
      accuracy: 6,
      timestamp: Date.now(),
    },
    isGhostMode: true,
    isVoluntarilyVisible: false,
    warningCountdown: null,
    revealedUntil: null,
    revealsUsedOnHim: 0,
    timeAliveSeconds: 0,
    bingo: {
      submissions: {},
      completedCount: 0,
      linesCount: 0,
      hasWonBingo: false,
    },
    joinedAt: Date.now(),
    timeline: [
      {
        id: `tl-bot-${Date.now()}`,
        timestamp: Date.now(),
        timeStr: new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }),
        text: `${candidate.name} joined as practice player`,
        type: 'join',
      },
    ],
  };

  room.players[botId] = botPlayer;
  if (candidate.role === 'SEEKER' && !room.seeker.playerId) {
    room.seeker.playerId = botId;
  }

  addEvent(room, 'GAME_STARTED', `🤖 Added bot contestant ${botPlayer.name}`, botPlayer.id, botPlayer.name);
  broadcastRoom(code);
  res.json({ success: true, bot: botPlayer, room });
});

// Leave game room
app.post('/api/rooms/:code/leave', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms[code];
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const { playerId } = req.body;
  if (playerId && room.players[playerId]) {
    const pName = room.players[playerId].name;
    delete room.players[playerId];
    if (room.seeker.playerId === playerId) {
      room.seeker.playerId = null;
    }
    addEvent(room, 'GAME_STARTED', `${pName} left the game`, playerId, pName);
    broadcastRoom(code);
  }
  res.json({ success: true });
});

// Update player location (GPS)
app.post('/api/rooms/:code/location', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms[code];
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const { playerId, lat, lng, accuracy } = req.body;
  const player = room.players[playerId];
  if (!player) return res.status(404).json({ error: 'Player not found' });

  player.location = {
    lat,
    lng,
    accuracy: accuracy || 5,
    timestamp: Date.now(),
  };

  // Immediate boundary evaluation for responsive alert
  if (room.status === 'ACTIVE' && player.role === 'HIDER' && player.status !== 'ELIMINATED') {
    const boundCheck = checkBoundaryStatus(player.location, room.boundary);
    if (boundCheck.status === 'OUTSIDE') {
      if (player.warningCountdown === null) {
        player.warningCountdown = 10;
        player.status = 'WARNING';
        addEvent(room, 'BOUNDARY_WARNING', `⚠️ ${player.name} left the game area! 10s to return!`, player.id, player.name, true);
      }
    } else {
      if (player.warningCountdown !== null) {
        player.warningCountdown = null;
        player.status = player.revealedUntil && player.revealedUntil > Date.now() ? 'REVEALED' : (player.isGhostMode ? 'HIDING' : 'VISIBLE');
        addEvent(room, 'BOUNDARY_RETURNED', `🛡️ ${player.name} returned to the game zone`, player.id, player.name, false);
      }
    }
  }

  broadcastRoom(code);
  res.json({ success: true, player });
});

// Toggle Ghost mode
app.post('/api/rooms/:code/ghost', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms[code];
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const { playerId, enable } = req.body;
  const player = room.players[playerId];
  if (!player) return res.status(404).json({ error: 'Player not found' });

  player.isGhostMode = Boolean(enable);
  if (player.isGhostMode) {
    player.isVoluntarilyVisible = false;
    if (player.status === 'VISIBLE') player.status = 'HIDING';
    addEvent(room, 'GHOST_MODE', `${player.name} activated Ghost Mode (location concealed)`, player.id, player.name);
  } else {
    player.status = 'VISIBLE';
    addEvent(room, 'VOLUNTARY_VISIBLE', `${player.name} deactivated Ghost Mode`, player.id, player.name);
  }

  broadcastRoom(code);
  res.json({ success: true, player });
});

// Player Show Location voluntarily ("SHOW ME")
app.post('/api/rooms/:code/show-me', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms[code];
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const { playerId, visible } = req.body;
  const player = room.players[playerId];
  if (!player) return res.status(404).json({ error: 'Player not found' });

  player.isVoluntarilyVisible = Boolean(visible);
  if (player.isVoluntarilyVisible) {
    player.isGhostMode = false;
    player.status = 'VISIBLE';
    addEvent(room, 'VOLUNTARY_VISIBLE', `⚡ ${player.name} deliberately showed their location on the map!`, player.id, player.name, true);
  } else {
    player.isGhostMode = true;
    player.status = 'HIDING';
    addEvent(room, 'GHOST_MODE', `${player.name} turned off voluntary beacon`, player.id, player.name);
  }

  broadcastRoom(code);
  res.json({ success: true, player });
});

// Seeker Reveal Player (Consumes 1 of 3 reveals for 15s)
app.post('/api/rooms/:code/seeker-reveal', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms[code];
  if (!room) return res.status(404).json({ error: 'Room not found' });

  if (room.seeker.revealsUsed >= room.seeker.revealsTotal) {
    return res.status(400).json({ error: 'No reveals remaining!' });
  }

  const { targetPlayerId, durationSeconds = 15 } = req.body;
  const target = room.players[targetPlayerId];
  if (!target || target.status === 'ELIMINATED') {
    return res.status(400).json({ error: 'Target player unavailable or eliminated' });
  }

  room.seeker.revealsUsed += 1;
  const expiresAt = Date.now() + durationSeconds * 1000;

  room.seeker.activeReveal = {
    targetPlayerId: target.id,
    targetName: target.name,
    expiresAt,
    durationSeconds,
  };

  target.revealedUntil = expiresAt;
  target.revealsUsedOnHim += 1;
  target.status = 'REVEALED';

  addEvent(
    room,
    'REVEAL_USED',
    `🎯 SEEKER REVEAL USED (${room.seeker.revealsUsed}/3): ${target.name}'s position is revealed for ${durationSeconds}s!`,
    target.id,
    target.name,
    true
  );

  broadcastRoom(code);
  res.json({ success: true, room });
});

// Submit Bingo proof
app.post('/api/rooms/:code/bingo-submit', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms[code];
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const { playerId, challengeId, proofUrl, proofNote } = req.body;
  const player = room.players[playerId];
  if (!player) return res.status(404).json({ error: 'Player not found' });

  player.bingo.submissions[challengeId] = {
    challengeId,
    status: 'PENDING',
    proofUrl,
    proofNote,
    submittedAt: Date.now(),
  };

  addEvent(
    room,
    'CHALLENGE_SUBMITTED',
    `📸 ${player.name} submitted proof for Challenge #${challengeId}`,
    player.id,
    player.name
  );

  broadcastRoom(code);
  res.json({ success: true, player });
});

// Game Master reviews Bingo submission
app.post('/api/rooms/:code/bingo-review', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms[code];
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const { playerId, challengeId, approved, feedback } = req.body;
  const player = room.players[playerId];
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const sub = player.bingo.submissions[challengeId];
  if (!sub) return res.status(404).json({ error: 'Submission not found' });

  sub.status = approved ? 'APPROVED' : 'REJECTED';
  sub.reviewedAt = Date.now();
  sub.feedback = feedback || (approved ? 'Verified by Game Master' : 'Requirements not met. Try again!');

  // Recalculate bingo lines
  const approvedIds = new Set(
    Object.values(player.bingo.submissions)
      .filter((s) => s.status === 'APPROVED')
      .map((s) => s.challengeId)
  );
  const { linesCount, hasFullCard } = calculateBingoLines(approvedIds);

  player.bingo.completedCount = approvedIds.size;
  player.bingo.linesCount = linesCount;

  if (approved) {
    addEvent(
      room,
      'CHALLENGE_APPROVED',
      `✅ Game Master APPROVED Challenge #${challengeId} for ${player.name} (${player.bingo.completedCount}/25)`,
      player.id,
      player.name
    );

    // Bingo detection (at least 1 line or 5 in a row, or full card)
    if ((linesCount > 0 || hasFullCard) && !player.bingo.hasWonBingo) {
      player.bingo.hasWonBingo = true;
      player.bingo.bingoTimestamp = Date.now();
      player.status = 'BINGO';
      addEvent(
        room,
        'BINGO_ACHIEVED',
        `🎉 BINGO! ${player.name} COMPLETED BINGO OBJECTIVE (${linesCount} lines)!`,
        player.id,
        player.name,
        true
      );
    }
  } else {
    addEvent(
      room,
      'CHALLENGE_REJECTED',
      `❌ Game Master REJECTED Challenge #${challengeId} for ${player.name}: ${sub.feedback}`,
      player.id,
      player.name
    );
  }

  broadcastRoom(code);
  res.json({ success: true, player, room });
});

// Admin Controls (START, PAUSE, RESUME, EXTEND, ELIMINATE, END, RESET, SET_BOUNDARY)
app.post('/api/rooms/:code/admin-action', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms[code];
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const { action, targetPlayerId, extraSeconds, boundaryCoordinates, bufferMeters } = req.body;

  switch (action) {
    case 'START':
      room.status = 'ACTIVE';
      room.startedAt = Date.now();
      for (const pId in room.players) {
        if (room.players[pId].status === 'WAITING') {
          room.players[pId].status = room.players[pId].role === 'SEEKER' ? 'VISIBLE' : 'HIDING';
        }
      }
      addEvent(room, 'GAME_STARTED', '🚀 CAHUL HUNT HAS OFFICIALLY STARTED! Hide. Complete. Survive.', undefined, undefined, true);
      break;

    case 'PAUSE':
      room.status = 'PAUSED';
      addEvent(room, 'GAME_PAUSED', '⏸️ GAME PAUSED by Game Master', undefined, undefined, true);
      break;

    case 'RESUME':
      room.status = 'ACTIVE';
      addEvent(room, 'GAME_RESUMED', '▶️ GAME RESUMED by Game Master', undefined, undefined, true);
      break;

    case 'EXTEND':
      room.remainingSeconds += extraSeconds || 600; // default +10m
      addEvent(room, 'GAME_RESUMED', `⏱️ Game timer extended by ${Math.floor((extraSeconds || 600) / 60)} minutes`, undefined, undefined, true);
      break;

    case 'ELIMINATE_PLAYER':
      if (targetPlayerId && room.players[targetPlayerId]) {
        const target = room.players[targetPlayerId];
        target.status = 'ELIMINATED';
        target.warningCountdown = 0;
        addEvent(room, 'ELIMINATED', `🛑 ${target.name} manually eliminated by Game Master`, target.id, target.name, true);
      }
      break;

    case 'END':
      room.status = 'ENDED';
      room.endedAt = Date.now();
      addEvent(room, 'GAME_ENDED', '🏁 GAME OVER called by Game Master! Calculating winners...', undefined, undefined, true);
      break;

    case 'RESET':
      rooms[code] = createInitialRoom(code, { withBots: code === 'C4HUL7' });
      broadcastRoom(code);
      return res.json({ success: true, room: rooms[code] });

    case 'SET_BOUNDARY':
      if (boundaryCoordinates && Array.isArray(boundaryCoordinates)) {
        room.boundary.coordinates = boundaryCoordinates;
      }
      if (typeof bufferMeters === 'number') {
        room.boundary.bufferMeters = bufferMeters;
      }
      addEvent(room, 'GAME_STARTED', '📍 Official Cahul Game Zone boundary updated by Game Master', undefined, undefined, false);
      break;

    case 'TOGGLE_LOCK':
      room.isLobbyLocked = !room.isLobbyLocked;
      break;

    default:
      return res.status(400).json({ error: 'Unknown admin action' });
  }

  broadcastRoom(code);
  res.json({ success: true, room });
});

// Emergency SOS trigger
app.post('/api/rooms/:code/sos', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms[code];
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const { playerId, active, message } = req.body;
  const player = room.players[playerId];
  if (!player) return res.status(404).json({ error: 'Player not found' });

  if (active) {
    player.sosAlert = {
      active: true,
      message: message || 'Urgent assistance requested by player!',
      timestamp: Date.now(),
      location: player.location,
    };
    addEvent(room, 'SOS_ALERT', `🚨 SOS FROM ${player.name.toUpperCase()}! Coordinates: ${player.location.lat.toFixed(4)}, ${player.location.lng.toFixed(4)}`, player.id, player.name, true);
  } else {
    player.sosAlert = null;
    addEvent(room, 'GAME_STARTED', `🛡️ SOS alert resolved for ${player.name}`, player.id, player.name, false);
  }

  broadcastRoom(code);
  res.json({ success: true, player });
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cahul Hunt server running on http://0.0.0.0:${PORT}`);
  });
}

start();
