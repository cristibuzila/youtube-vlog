import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { GameRoom, Player, PlayerRole } from '../types';
import { CAHUL_CENTER, CAHUL_LANDMARKS, checkBoundaryStatus } from '../utils/geo';
import { Compass, Eye, EyeOff, Navigation, Shield, ShieldAlert, Crosshair, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface CahulMapProps {
  room: GameRoom;
  activePlayerId: string;
  role: PlayerRole;
  onUpdateLocation: (lat: number, lng: number, accuracy?: number) => void;
  onSelectPlayer?: (player: Player) => void;
  gpsActive?: boolean;
  onRequestGPS?: () => void;
  realLocation?: { lat: number; lng: number; accuracy: number } | null;
}

export const CahulMap: React.FC<CahulMapProps> = ({
  room,
  activePlayerId,
  role,
  onUpdateLocation,
  onSelectPlayer,
  gpsActive = false,
  onRequestGPS,
  realLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const boundaryLayerRef = useRef<L.Polygon | null>(null);
  const bufferLayerRef = useRef<L.Polygon | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const landmarksLayerRef = useRef<L.LayerGroup | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);

  const [useRealGPS, setUseRealGPS] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [mapTheme, setMapTheme] = useState<'tactical' | 'outdoor'>('tactical');
  const [followUser, setFollowUser] = useState<boolean>(true);

  const onUpdateLocationRef = useRef(onUpdateLocation);
  useEffect(() => {
    onUpdateLocationRef.current = onUpdateLocation;
  });

  const activePlayer = room.players[activePlayerId];

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [CAHUL_CENTER.lat, CAHUL_CENTER.lng],
      zoom: CAHUL_CENTER.zoom,
      zoomControl: false,
      attributionControl: false,
    });

    // High quality OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const boundaryGroup = L.polygon([], {
      color: '#f59e0b',
      weight: 3.5,
      fillColor: '#f59e0b',
      fillOpacity: 0.12,
      dashArray: undefined,
    }).addTo(map);

    const bufferGroup = L.polygon([], {
      color: '#ef4444',
      weight: 2,
      fillColor: '#ef4444',
      fillOpacity: 0.05,
      dashArray: '5, 8',
    }).addTo(map);

    const landmarksGroup = L.layerGroup().addTo(map);
    const markersGroup = L.layerGroup().addTo(map);

    boundaryLayerRef.current = boundaryGroup;
    bufferLayerRef.current = bufferGroup;
    landmarksLayerRef.current = landmarksGroup;
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Add landmarks
    landmarksGroup.clearLayers();
    CAHUL_LANDMARKS.forEach((lm) => {
      const landmarkIcon = L.divIcon({
        className: 'custom-landmark-marker',
        html: `
          <div class="px-2 py-1 bg-neutral-900/90 border border-neutral-700 rounded text-[10px] font-medium text-neutral-300 shadow-md whitespace-nowrap flex items-center gap-1">
            <span>${lm.icon}</span>
            <span>${lm.name}</span>
          </div>
        `,
        iconSize: [120, 24],
        iconAnchor: [60, 12],
      });
      L.marker([lm.lat, lm.lng], { icon: landmarkIcon }).addTo(landmarksGroup);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update boundary polygon & buffer zone
  useEffect(() => {
    if (!mapInstanceRef.current || !boundaryLayerRef.current || !bufferLayerRef.current) return;

    const coords = room.boundary.coordinates.map((c) => [c[0], c[1]] as [number, number]);
    boundaryLayerRef.current.setLatLngs(coords);

    // Approximate buffer zone for visualization (slightly expanded coords)
    const centerLat = coords.reduce((acc, p) => acc + p[0], 0) / coords.length;
    const centerLng = coords.reduce((acc, p) => acc + p[1], 0) / coords.length;
    const bufferCoords = coords.map(([lat, lng]) => {
      const latDiff = lat - centerLat;
      const lngDiff = lng - centerLng;
      return [lat + latDiff * 0.12, lng + lngDiff * 0.12] as [number, number];
    });
    bufferLayerRef.current.setLatLngs(bufferCoords);
  }, [room.boundary]);

  // Update Player and Seeker markers based on Role visibility rules
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const markersGroup = markersLayerRef.current;
    markersGroup.clearLayers();

    const now = Date.now();
    const playersList = Object.values(room.players);

    playersList.forEach((p) => {
      // Determine if this player should be visible on map
      let isVisibleOnMap = false;

      if (role === 'ADMIN') {
        // Game Master sees all players unconditionally
        isVisibleOnMap = true;
      } else if (p.id === activePlayerId) {
        // You always see yourself
        isVisibleOnMap = true;
      } else if (role === 'SEEKER') {
        // Seeker sees seeker, voluntarily visible hiders, or temporarily revealed hiders
        if (p.role === 'SEEKER') {
          isVisibleOnMap = true;
        } else if (p.revealedUntil && p.revealedUntil > now) {
          isVisibleOnMap = true;
        } else if (p.isVoluntarilyVisible || !p.isGhostMode) {
          isVisibleOnMap = true;
        }
      } else if (role === 'HIDER') {
        // Hider sees Seeker (if Seeker is visible) and voluntarily visible teammates, but hidden players are concealed
        if (p.role === 'SEEKER') {
          isVisibleOnMap = true;
        } else if (p.isVoluntarilyVisible) {
          isVisibleOnMap = true;
        }
      }

      if (!isVisibleOnMap) return;

      const isCurrent = p.id === activePlayerId;
      const isSeeker = p.role === 'SEEKER';
      const isRevealed = p.revealedUntil && p.revealedUntil > now;
      const isOutside = p.warningCountdown !== null;
      const isEliminated = p.status === 'ELIMINATED';

      let markerBg = 'bg-emerald-500 text-black border-emerald-300';
      if (isSeeker) {
        markerBg = 'bg-rose-600 text-white border-rose-400 ring-4 ring-rose-500/30 animate-pulse';
      } else if (isEliminated) {
        markerBg = 'bg-neutral-800 text-neutral-400 border-neutral-600 opacity-60';
      } else if (isOutside) {
        markerBg = 'bg-amber-500 text-black border-amber-300 animate-bounce ring-4 ring-amber-400/40';
      } else if (isRevealed) {
        markerBg = 'bg-purple-600 text-white border-purple-300 ring-4 ring-purple-500/50 animate-pulse';
      } else if (p.isGhostMode && role === 'ADMIN') {
        markerBg = 'bg-cyan-600 text-white border-cyan-300';
      }

      const customIcon = L.divIcon({
        className: 'player-map-pin',
        html: `
          <div class="relative flex flex-col items-center cursor-pointer group">
            ${isCurrent ? '<div class="absolute -top-1 w-10 h-10 rounded-full border-2 border-amber-400 radar-ring pointer-events-none"></div>' : ''}
            ${isRevealed ? '<div class="absolute -top-2 px-1.5 py-0.5 bg-purple-600 text-[9px] font-bold text-white rounded-full tracking-wider animate-pulse uppercase">REVEALED</div>' : ''}
            <div class="w-9 h-9 rounded-full ${markerBg} border-2 flex items-center justify-center text-base shadow-xl font-bold transition-transform group-hover:scale-110">
              ${p.avatar || '👤'}
            </div>
            <div class="mt-1 px-1.5 py-0.5 rounded bg-neutral-950/90 border border-neutral-700 text-[10px] font-semibold text-neutral-200 shadow-md whitespace-nowrap flex items-center gap-1">
              <span>${p.nickname || p.name}</span>
              ${isCurrent ? '<span class="text-amber-400 font-extrabold text-[9px]">(YOU)</span>' : ''}
              ${p.isGhostMode && role === 'ADMIN' ? '<span class="text-cyan-400 text-[9px]">👻</span>' : ''}
            </div>
          </div>
        `,
        iconSize: [36, 50],
        iconAnchor: [18, 44],
      });

      const marker = L.marker([p.location.lat, p.location.lng], { icon: customIcon }).addTo(markersGroup);

      marker.on('click', () => {
        if (onSelectPlayer) {
          onSelectPlayer(p);
        }
      });
    });

    // Draw / update GPS accuracy halo circle for active player
    if (activePlayer && mapInstanceRef.current) {
      const accuracyMeters = realLocation?.accuracy || activePlayer.location.accuracy || 15;
      if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = L.circle([activePlayer.location.lat, activePlayer.location.lng], {
          radius: Math.max(accuracyMeters, 5),
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.12,
          weight: 1.5,
          dashArray: '3, 6',
        }).addTo(mapInstanceRef.current);
      } else {
        accuracyCircleRef.current.setLatLng([activePlayer.location.lat, activePlayer.location.lng]);
        accuracyCircleRef.current.setRadius(Math.max(accuracyMeters, 5));
      }
    }

    // Auto-center map on user if enabled
    if (followUser && activePlayer && mapInstanceRef.current) {
      mapInstanceRef.current.panTo([activePlayer.location.lat, activePlayer.location.lng], {
        animate: true,
      });
    }
  }, [room.players, room.seeker, activePlayerId, role, followUser, realLocation]);

  // Standalone Real GPS Geolocation Watcher (only if no external onRequestGPS provided)
  useEffect(() => {
    if (onRequestGPS || !useRealGPS) return;

    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation is not supported by your browser.');
      setUseRealGPS(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsError(null);
        onUpdateLocationRef.current?.(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
      },
      (err) => {
        setGpsError(err.message || 'GPS Signal lost. Switch to simulator if indoors.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [useRealGPS, onRequestGPS]);

  // Manual GPS Walk Simulator (Step 0.0003 deg ~ 30 meters)
  const moveSimulated = (deltaLat: number, deltaLng: number) => {
    if (!activePlayer) return;
    const newLat = activePlayer.location.lat + deltaLat;
    const newLng = activePlayer.location.lng + deltaLng;
    onUpdateLocation(newLat, newLng, 4);
  };

  const boundaryStatus = activePlayer ? checkBoundaryStatus(activePlayer.location, room.boundary) : { status: 'SAFE', distanceToBoundaryMeters: 0 };

  return (
    <div className="relative w-full h-full min-h-[420px] bg-neutral-950 overflow-hidden flex flex-col">
      {/* Map Header Status Strip */}
      <div className="absolute top-3 left-3 right-3 z-400 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 bg-neutral-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-neutral-800 shadow-xl">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="text-xs font-bold tracking-wider text-neutral-200 uppercase font-mono">
            CAHUL MAP
          </span>
          <span className="text-[10px] text-neutral-400 border-l border-neutral-700 pl-2">
            ZONE: {room.boundary.name.split('(')[0]}
          </span>
        </div>

        {/* Boundary status badge */}
        <div className="pointer-events-auto flex items-center gap-2">
          {boundaryStatus.status === 'SAFE' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/90 text-emerald-300 border border-emerald-800 text-xs font-bold shadow-lg">
              <Shield className="w-3.5 h-3.5" />
              <span>INSIDE SAFE ZONE</span>
            </div>
          )}
          {boundaryStatus.status === 'BUFFER' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/90 text-amber-300 border border-amber-700 text-xs font-bold shadow-lg animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>BUFFER ZONE ({Math.round(boundaryStatus.distanceToBoundaryMeters)}m)</span>
            </div>
          )}
          {boundaryStatus.status === 'OUTSIDE' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/95 text-red-300 border border-red-700 text-xs font-extrabold shadow-lg animate-bounce">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>OUTSIDE ZONE!</span>
            </div>
          )}

          {/* Map theme toggle */}
          <button
            id="btn-toggle-map-theme"
            onClick={() => setMapTheme(mapTheme === 'tactical' ? 'outdoor' : 'tactical')}
            className="p-1.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-neutral-300 hover:text-white transition shadow-lg"
            title="Toggle Map Style"
          >
            {mapTheme === 'tactical' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Leaflet Container */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full flex-1 z-0 ${mapTheme === 'tactical' ? 'tactical-map' : 'outdoor-map'}`}
      />

      {/* GPS Error Alert */}
      {gpsError && (
        <div className="absolute top-14 left-3 right-3 z-400 bg-amber-900/90 border border-amber-700 text-amber-200 text-xs px-3 py-2 rounded-xl flex items-center justify-between shadow-xl">
          <span>{gpsError}</span>
          <button onClick={() => setGpsError(null)} className="font-bold underline ml-2">Dismiss</button>
        </div>
      )}

      {/* Map Controls: Real GPS vs Simulator & Pan Controls */}
      <div className="absolute bottom-4 left-3 z-400 flex flex-col gap-2 pointer-events-auto">
        {/* GPS Mode Toggle */}
        <div className="flex items-center gap-1 bg-neutral-900/90 backdrop-blur-md p-1 rounded-xl border border-neutral-800 shadow-xl">
          <button
            id="btn-toggle-real-gps"
            onClick={() => {
              if (!useRealGPS && onRequestGPS) {
                onRequestGPS();
              }
              setUseRealGPS(!useRealGPS);
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              useRealGPS || gpsActive
                ? 'bg-emerald-600 text-white shadow ring-2 ring-emerald-500/30'
                : 'bg-neutral-800 text-neutral-300 hover:text-white'
            }`}
          >
            <Navigation className={`w-3.5 h-3.5 ${(useRealGPS || gpsActive) ? 'animate-spin' : ''}`} />
            <span>{(useRealGPS || gpsActive) ? 'Live GPS ON' : 'Enable GPS'}</span>
          </button>

          <button
            id="btn-recenter-map"
            onClick={() => {
              if (activePlayer && mapInstanceRef.current) {
                mapInstanceRef.current.setView([activePlayer.location.lat, activePlayer.location.lng], 16);
                setFollowUser(true);
              }
            }}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg transition"
            title="Recenter on player"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>

        {/* Tactical Walk Simulator Joystick (Allows testing anywhere without walking in real Cahul) */}
        {!useRealGPS && (
          <div className="bg-neutral-900/95 backdrop-blur-md p-2 rounded-2xl border border-neutral-800 shadow-2xl flex flex-col items-center">
            <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-400 mb-1">
              GPS WALK SIMULATOR
            </span>
            <div className="grid grid-cols-3 gap-1 w-24">
              <div />
              <button
                id="btn-sim-north"
                onClick={() => moveSimulated(0.0003, 0)}
                className="h-8 bg-neutral-800 hover:bg-amber-600 text-white rounded-lg flex items-center justify-center transition active:scale-90"
                title="Walk North"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <div />

              <button
                id="btn-sim-west"
                onClick={() => moveSimulated(0, -0.0004)}
                className="h-8 bg-neutral-800 hover:bg-amber-600 text-white rounded-lg flex items-center justify-center transition active:scale-90"
                title="Walk West"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="h-8 flex items-center justify-center">
                <Compass className="w-4 h-4 text-amber-500 animate-spin" />
              </div>
              <button
                id="btn-sim-east"
                onClick={() => moveSimulated(0, 0.0004)}
                className="h-8 bg-neutral-800 hover:bg-amber-600 text-white rounded-lg flex items-center justify-center transition active:scale-90"
                title="Walk East"
              >
                <ArrowRight className="w-4 h-4" />
              </button>

              <div />
              <button
                id="btn-sim-south"
                onClick={() => moveSimulated(-0.0003, 0)}
                className="h-8 bg-neutral-800 hover:bg-amber-600 text-white rounded-lg flex items-center justify-center transition active:scale-90"
                title="Walk South"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <div />
            </div>
            <div className="mt-1 text-[8px] text-neutral-500 text-center">
              Tap to step 30m in Cahul
            </div>
          </div>
        )}
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 right-3 z-400 bg-neutral-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-neutral-800 text-[10px] text-neutral-300 shadow-xl space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
          <span>Game Boundary</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
          <span>Buffer Zone (25m)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span>
          <span>Seeker Radar</span>
        </div>
      </div>
    </div>
  );
};
