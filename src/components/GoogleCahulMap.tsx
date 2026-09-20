import React, { useEffect, useRef, useState } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { GameRoom, Player, PlayerRole } from '../types';
import { CAHUL_CENTER, CAHUL_LANDMARKS, checkBoundaryStatus } from '../utils/geo';
import { 
  Compass, Eye, EyeOff, Navigation, Shield, ShieldAlert, Crosshair, 
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ExternalLink
} from 'lucide-react';

interface GoogleCahulMapProps {
  room: GameRoom;
  activePlayerId: string;
  role: PlayerRole;
  onUpdateLocation: (lat: number, lng: number, accuracy?: number) => void;
  onSelectPlayer?: (player: Player) => void;
  onSwitchToLeaflet?: () => void;
  gpsActive?: boolean;
  onRequestGPS?: () => void;
  realLocation?: { lat: number; lng: number; accuracy: number } | null;
}

// Tactical Military Dark Mode styling for Google Maps
const TACTICAL_DARK_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#18181b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#18181b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a1a1aa' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f59e0b' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#e4e4e7' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#14241d' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4ade80' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#27272a' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#3f3f46' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#cbd5e1' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#091e3a' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }],
  },
];

const createPlayerSvgPin = (avatar: string, bgColor: string, badge?: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="54" viewBox="0 0 48 54">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000000" flood-opacity="0.6"/>
        </filter>
      </defs>
      <path d="M24 0 C11 0 0 11 0 24 C0 38 24 54 24 54 C24 54 48 38 48 24 C48 11 37 0 24 0 Z" fill="${bgColor}" stroke="#ffffff" stroke-width="2" filter="url(#shadow)"/>
      <circle cx="24" cy="22" r="16" fill="#18181b" stroke="${bgColor}" stroke-width="2"/>
      <text x="24" y="27" font-size="16" text-anchor="middle" dominant-baseline="central">${avatar}</text>
      ${badge ? `<rect x="8" y="-4" width="32" height="12" rx="6" fill="#000000" stroke="${bgColor}" stroke-width="1.5"/><text x="24" y="4" font-size="8" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="central">${badge}</text>` : ''}
    </svg>
  `;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(42, 48),
    anchor: new google.maps.Point(21, 48),
  };
};

const createLandmarkSvgPin = (icon: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="42" viewBox="0 0 36 42">
      <path d="M18 0 C8.5 0 0 8.5 0 18 C0 29 18 42 18 42 C18 42 36 29 36 18 C36 8.5 27.5 0 18 0 Z" fill="#27272a" stroke="#f59e0b" stroke-width="1.5"/>
      <circle cx="18" cy="16" r="12" fill="#09090b"/>
      <text x="18" y="20" font-size="13" text-anchor="middle" dominant-baseline="central">${icon}</text>
    </svg>
  `;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(30, 36),
    anchor: new google.maps.Point(15, 36),
  };
};

export const GoogleCahulMap: React.FC<GoogleCahulMapProps> = ({
  room,
  activePlayerId,
  role,
  onUpdateLocation,
  onSelectPlayer,
  onSwitchToLeaflet,
  gpsActive = false,
  onRequestGPS,
  realLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const boundaryPolygonRef = useRef<google.maps.Polygon | null>(null);
  const bufferPolygonRef = useRef<google.maps.Polygon | null>(null);
  const markersMapRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const landmarkMarkersRef = useRef<google.maps.Marker[]>([]);
  const revealCircleRef = useRef<google.maps.Circle | null>(null);
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<'hybrid' | 'tactical' | 'roadmap'>('hybrid');
  const [useRealGPS, setUseRealGPS] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [followUser, setFollowUser] = useState<boolean>(true);

  const onUpdateLocationRef = useRef(onUpdateLocation);
  useEffect(() => {
    onUpdateLocationRef.current = onUpdateLocation;
  });

  const isGpsOn = gpsActive || useRealGPS;

  const activePlayer = room.players[activePlayerId];
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyAgwRDu7xdbQ6kMq08y37JUb7IbTUg4YOU';

  // Initialize Google Maps JavaScript API using dynamic importLibrary
  useEffect(() => {
    let isMounted = true;

    setOptions({
      key: apiKey,
      v: 'weekly',
    });

    importLibrary('maps')
      .then(() => {
        if (!isMounted || !mapContainerRef.current) return;

        const initialCenter = activePlayer
          ? { lat: activePlayer.location.lat, lng: activePlayer.location.lng }
          : { lat: CAHUL_CENTER.lat, lng: CAHUL_CENTER.lng };

        const map = new google.maps.Map(mapContainerRef.current, {
          center: initialCenter,
          zoom: 15,
          mapTypeId: google.maps.MapTypeId.HYBRID,
          disableDefaultUI: true,
          zoomControl: true,
          tilt: 0,
        });

        // Click anywhere to move simulated GPS location
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            onUpdateLocation(e.latLng.lat(), e.latLng.lng(), 5);
          }
        });

        googleMapRef.current = map;
        infoWindowRef.current = new google.maps.InfoWindow();
        setMapLoaded(true);
      })
      .catch((err) => {
        console.error('Google Maps load error:', err);
        setLoadError(err.message || 'Google Maps failed to load. Check API key permissions or network.');
      });

    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  // Handle map mode switch (Hybrid Satellite vs Tactical Dark vs Roadmap)
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;
    const map = googleMapRef.current;

    if (mapMode === 'hybrid') {
      map.setMapTypeId(google.maps.MapTypeId.HYBRID);
      map.setOptions({ styles: [] });
    } else if (mapMode === 'tactical') {
      map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
      map.setOptions({ styles: TACTICAL_DARK_STYLES });
    } else {
      map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
      map.setOptions({ styles: [] });
    }
  }, [mapMode, mapLoaded]);

  // Update boundary polygon & buffer zone
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;
    const map = googleMapRef.current;

    const path = room.boundary.coordinates.map(([lat, lng]) => ({ lat, lng }));

    if (boundaryPolygonRef.current) boundaryPolygonRef.current.setMap(null);
    if (bufferPolygonRef.current) bufferPolygonRef.current.setMap(null);

    // Official Cahul Game Zone Polygon
    const boundaryPolygon = new google.maps.Polygon({
      paths: path,
      strokeColor: '#f59e0b',
      strokeOpacity: 0.95,
      strokeWeight: 3.5,
      fillColor: '#f59e0b',
      fillOpacity: 0.15,
      map,
    });
    boundaryPolygonRef.current = boundaryPolygon;

    // Buffer Zone Polygon (~25m tolerance buffer)
    const centerLat = path.reduce((acc, p) => acc + p.lat, 0) / path.length;
    const centerLng = path.reduce((acc, p) => acc + p.lng, 0) / path.length;
    const bufferPath = path.map((p) => ({
      lat: p.lat + (p.lat - centerLat) * 0.12,
      lng: p.lng + (p.lng - centerLng) * 0.12,
    }));

    const bufferPolygon = new google.maps.Polygon({
      paths: bufferPath,
      strokeColor: '#ef4444',
      strokeOpacity: 0.7,
      strokeWeight: 2,
      fillColor: '#ef4444',
      fillOpacity: 0.05,
      map,
    });
    bufferPolygonRef.current = bufferPolygon;
  }, [room.boundary, mapLoaded]);

  // Render Landmarks
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;
    const map = googleMapRef.current;

    landmarkMarkersRef.current.forEach((m) => m.setMap(null));
    landmarkMarkersRef.current = [];

    CAHUL_LANDMARKS.forEach((lm) => {
      const marker = new google.maps.Marker({
        position: { lat: lm.lat, lng: lm.lng },
        map,
        title: lm.name,
        icon: createLandmarkSvgPin(lm.icon),
      });

      marker.addListener('click', () => {
        if (infoWindowRef.current) {
          infoWindowRef.current.setContent(`
            <div style="color: #111; font-family: sans-serif; padding: 4px;">
              <strong style="font-size: 13px;">${lm.icon} ${lm.name}</strong>
              <div style="font-size: 11px; color: #555; margin-top: 2px;">Cahul Competition Landmark</div>
            </div>
          `);
          infoWindowRef.current.open(map, marker);
        }
      });

      landmarkMarkersRef.current.push(marker);
    });
  }, [mapLoaded]);

  // Render Player Markers & Seeker Radar Circle
  useEffect(() => {
    if (!googleMapRef.current || !mapLoaded) return;
    const map = googleMapRef.current;
    const now = Date.now();

    // Remove obsolete markers
    const currentActiveIds = new Set<string>();

    const playersList = Object.values(room.players);

    playersList.forEach((p) => {
      // Visibility rules
      let isVisibleOnMap = false;
      if (role === 'ADMIN') {
        isVisibleOnMap = true;
      } else if (p.id === activePlayerId) {
        isVisibleOnMap = true;
      } else if (role === 'SEEKER') {
        if (p.role === 'SEEKER') isVisibleOnMap = true;
        else if (p.revealedUntil && p.revealedUntil > now) isVisibleOnMap = true;
        else if (p.isVoluntarilyVisible || !p.isGhostMode) isVisibleOnMap = true;
      } else if (role === 'HIDER') {
        if (p.role === 'SEEKER') isVisibleOnMap = true;
        else if (p.isVoluntarilyVisible) isVisibleOnMap = true;
      }

      if (!isVisibleOnMap) return;

      currentActiveIds.add(p.id);

      const isCurrent = p.id === activePlayerId;
      const isSeeker = p.role === 'SEEKER';
      const isRevealed = p.revealedUntil && p.revealedUntil > now;
      const isOutside = p.warningCountdown !== null;
      const isEliminated = p.status === 'ELIMINATED';
      const isSOS = p.sosAlert?.active;

      let bgColor = '#10b981'; // green hider
      let badge: string | undefined = undefined;

      if (isSOS) {
        bgColor = '#ef4444';
        badge = '🚨 SOS';
      } else if (isSeeker) {
        bgColor = '#e11d48';
        badge = 'SEEKER';
      } else if (isEliminated) {
        bgColor = '#52525b';
        badge = 'OUT';
      } else if (isOutside) {
        bgColor = '#f59e0b';
        badge = `WARN ${p.warningCountdown}s`;
      } else if (isRevealed) {
        bgColor = '#9333ea';
        badge = 'REVEALED';
      } else if (p.isGhostMode && role === 'ADMIN') {
        bgColor = '#06b6d4';
        badge = 'GHOST';
      } else if (isCurrent) {
        badge = 'YOU';
      }

      const icon = createPlayerSvgPin(p.avatar || '👤', bgColor, badge);
      const position = { lat: p.location.lat, lng: p.location.lng };

      let existingMarker = markersMapRef.current.get(p.id);
      if (!existingMarker) {
        existingMarker = new google.maps.Marker({
          position,
          map,
          title: `${p.name} (@${p.nickname})`,
          icon,
        });

        existingMarker.addListener('click', () => {
          if (onSelectPlayer) {
            onSelectPlayer(p);
          }
          if (infoWindowRef.current) {
            infoWindowRef.current.setContent(`
              <div style="color: #18181b; font-family: sans-serif; padding: 6px; min-width: 150px;">
                <div style="font-weight: 800; font-size: 14px;">${p.avatar} ${p.name}</div>
                <div style="font-size: 11px; color: #6b7280;">@${p.nickname} • ${p.role}</div>
                <div style="font-size: 11px; margin-top: 4px; font-family: monospace;">Status: <strong>${p.status}</strong></div>
                <div style="font-size: 11px; color: #4b5563; font-family: monospace;">Bingo: ${p.bingo?.completedCount || 0}/25</div>
              </div>
            `);
            infoWindowRef.current.open(map, existingMarker);
          }
        });

        markersMapRef.current.set(p.id, existingMarker);
      } else {
        existingMarker.setPosition(position);
        existingMarker.setIcon(icon);
      }
    });

    // Remove markers that are no longer visible
    markersMapRef.current.forEach((marker, id) => {
      if (!currentActiveIds.has(id)) {
        marker.setMap(null);
        markersMapRef.current.delete(id);
      }
    });

    // Seeker reveal radius ring
    if (room.seeker.activeReveal && room.seeker.activeReveal.expiresAt > now) {
      const targetPlayer = room.players[room.seeker.activeReveal.targetPlayerId];
      if (targetPlayer) {
        const center = { lat: targetPlayer.location.lat, lng: targetPlayer.location.lng };
        if (!revealCircleRef.current) {
          revealCircleRef.current = new google.maps.Circle({
            strokeColor: '#9333ea',
            strokeOpacity: 0.9,
            strokeWeight: 2.5,
            fillColor: '#9333ea',
            fillOpacity: 0.2,
            map,
            radius: 50,
            center,
          });
        } else {
          revealCircleRef.current.setCenter(center);
          revealCircleRef.current.setMap(map);
        }
      }
    } else if (revealCircleRef.current) {
      revealCircleRef.current.setMap(null);
    }

    // Draw / update GPS accuracy halo circle for active player
    if (googleMapRef.current && activePlayer) {
      const accuracyMeters = realLocation?.accuracy || activePlayer.location.accuracy || 15;
      const center = { lat: activePlayer.location.lat, lng: activePlayer.location.lng };
      if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = new google.maps.Circle({
          strokeColor: '#10b981',
          strokeOpacity: 0.8,
          strokeWeight: 1.5,
          fillColor: '#10b981',
          fillOpacity: 0.15,
          map: googleMapRef.current,
          radius: Math.max(accuracyMeters, 5),
          center,
        });
      } else {
        accuracyCircleRef.current.setCenter(center);
        accuracyCircleRef.current.setRadius(Math.max(accuracyMeters, 5));
        accuracyCircleRef.current.setMap(googleMapRef.current);
      }
    }

    // Auto-pan to player
    if (followUser && activePlayer && googleMapRef.current) {
      googleMapRef.current.panTo({
        lat: activePlayer.location.lat,
        lng: activePlayer.location.lng,
      });
    }
  }, [room.players, room.seeker, activePlayerId, role, mapLoaded, followUser, onSelectPlayer, realLocation]);

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
        setGpsError(err.message || 'GPS signal unavailable indoors. Use the simulator.');
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

  // Manual GPS Walk Simulator (step ~30m in Cahul)
  const moveSimulated = (deltaLat: number, deltaLng: number) => {
    if (!activePlayer) return;
    const newLat = activePlayer.location.lat + deltaLat;
    const newLng = activePlayer.location.lng + deltaLng;
    onUpdateLocation(newLat, newLng, 4);
  };

  const boundaryStatus = activePlayer 
    ? checkBoundaryStatus(activePlayer.location, room.boundary) 
    : { status: 'SAFE', distanceToBoundaryMeters: 0 };

  return (
    <div className="relative w-full h-full min-h-[420px] bg-neutral-950 overflow-hidden flex flex-col">
      {/* Top Map Header HUD */}
      <div className="absolute top-3 left-3 right-3 z-400 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 bg-neutral-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-neutral-800 shadow-xl">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold tracking-wider text-white uppercase font-mono">
            GOOGLE MAPS • CAHUL
          </span>
          <span className="text-[10px] text-neutral-400 border-l border-neutral-700 pl-2">
            ZONE: {room.boundary.name.split('(')[0]}
          </span>
        </div>

        {/* Boundary status badge & controls */}
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
              <span>BUFFER ({Math.round(boundaryStatus.distanceToBoundaryMeters)}m)</span>
            </div>
          )}
          {boundaryStatus.status === 'OUTSIDE' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/95 text-red-300 border border-red-700 text-xs font-extrabold shadow-lg animate-bounce">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>OUTSIDE ZONE!</span>
            </div>
          )}

          {/* Map Layer Switcher (Satellite Hybrid vs Tactical Dark vs Standard) */}
          <div className="flex items-center bg-neutral-900/90 border border-neutral-800 p-0.5 rounded-xl shadow-lg">
            <button
              onClick={() => setMapMode('hybrid')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition ${
                mapMode === 'hybrid' ? 'bg-amber-500 text-black' : 'text-neutral-400 hover:text-white'
              }`}
              title="Google Satellite & Street Labels"
            >
              SATELLITE
            </button>
            <button
              onClick={() => setMapMode('tactical')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition ${
                mapMode === 'tactical' ? 'bg-amber-500 text-black' : 'text-neutral-400 hover:text-white'
              }`}
              title="Tactical Dark Map"
            >
              TACTICAL
            </button>
            <button
              onClick={() => setMapMode('roadmap')}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition ${
                mapMode === 'roadmap' ? 'bg-amber-500 text-black' : 'text-neutral-400 hover:text-white'
              }`}
              title="Standard Road Map"
            >
              STREET
            </button>
          </div>

          {/* Direct link to user's Google Maps URL */}
          <a
            href="https://maps.app.goo.gl/SeDane38JN12TjRy7"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-neutral-900/90 border border-neutral-800 text-neutral-300 hover:text-amber-400 transition shadow-lg flex items-center gap-1"
            title="Open Cahul in Google Maps App"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Google Maps Container */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-0" />

      {/* Error Banner if Google Maps fails */}
      {loadError && (
        <div className="absolute inset-x-4 top-16 z-450 bg-red-950/90 border border-red-700 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between">
          <div className="text-xs">
            <span className="font-bold">Google Maps Notice:</span> {loadError}
          </div>
          {onSwitchToLeaflet && (
            <button
              onClick={onSwitchToLeaflet}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 text-xs font-bold hover:bg-neutral-700 transition ml-3 shrink-0"
            >
              Switch to Vector Map
            </button>
          )}
        </div>
      )}

      {/* GPS Error Alert */}
      {gpsError && (
        <div className="absolute top-14 left-3 right-3 z-400 bg-amber-900/90 border border-amber-700 text-amber-200 text-xs px-3 py-2 rounded-xl flex items-center justify-between shadow-xl">
          <span>{gpsError}</span>
          <button onClick={() => setGpsError(null)} className="font-bold underline ml-2">Dismiss</button>
        </div>
      )}

      {/* Map Controls: Real GPS vs Simulator & Pan Controls */}
      <div className="absolute bottom-4 left-3 z-400 flex flex-col gap-2 pointer-events-auto">
        {/* GPS Mode Toggle & Recenter */}
        <div className="flex items-center gap-1 bg-neutral-900/90 backdrop-blur-md p-1 rounded-xl border border-neutral-800 shadow-xl">
          <button
            id="btn-toggle-real-gps-gmap"
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
            id="btn-recenter-gmap"
            onClick={() => {
              if (activePlayer && googleMapRef.current) {
                googleMapRef.current.panTo({
                  lat: activePlayer.location.lat,
                  lng: activePlayer.location.lng,
                });
                googleMapRef.current.setZoom(16);
                setFollowUser(true);
              }
            }}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg transition"
            title="Recenter on player"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>

        {/* Tactical Walk Simulator Joystick */}
        {!useRealGPS && (
          <div className="bg-neutral-900/95 backdrop-blur-md p-2 rounded-2xl border border-neutral-800 shadow-2xl flex flex-col items-center">
            <div className="flex items-center justify-between w-full px-1 mb-1">
              <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-400">
                GPS SIMULATOR
              </span>
              <span className="text-[9px] text-amber-400 font-mono">30m/step</span>
            </div>
            <div className="grid grid-cols-3 gap-1 w-24">
              <div />
              <button
                id="btn-gmap-sim-north"
                onClick={() => moveSimulated(0.0003, 0)}
                className="h-8 bg-neutral-800 hover:bg-amber-600 text-white rounded-lg flex items-center justify-center transition active:scale-90"
                title="Walk North"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <div />

              <button
                id="btn-gmap-sim-west"
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
                id="btn-gmap-sim-east"
                onClick={() => moveSimulated(0, 0.0004)}
                className="h-8 bg-neutral-800 hover:bg-amber-600 text-white rounded-lg flex items-center justify-center transition active:scale-90"
                title="Walk East"
              >
                <ArrowRight className="w-4 h-4" />
              </button>

              <div />
              <button
                id="btn-gmap-sim-south"
                onClick={() => moveSimulated(-0.0003, 0)}
                className="h-8 bg-neutral-800 hover:bg-amber-600 text-white rounded-lg flex items-center justify-center transition active:scale-90"
                title="Walk South"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <div />
            </div>

            {/* Quick action buttons to test boundary violation rule */}
            <div className="mt-1.5 pt-1.5 border-t border-neutral-800 flex items-center gap-1 w-full">
              <button
                onClick={() => moveSimulated(0.006, 0.006)}
                className="flex-1 py-1 rounded bg-neutral-800 hover:bg-red-900 text-[8px] font-mono text-red-300 font-bold transition"
                title="Step outside boundary to trigger 10s warning"
              >
                STEP OUTSIDE
              </button>
              <button
                onClick={() => onUpdateLocation(CAHUL_CENTER.lat, CAHUL_CENTER.lng, 4)}
                className="flex-1 py-1 rounded bg-neutral-800 hover:bg-emerald-900 text-[8px] font-mono text-emerald-300 font-bold transition"
                title="Return to Cahul Center safe zone"
              >
                SAFE CENTER
              </button>
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
          <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block"></span>
          <span>Seeker Radar Reveal</span>
        </div>
      </div>
    </div>
  );
};
