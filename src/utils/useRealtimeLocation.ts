import { useEffect, useRef, useState, useCallback } from 'react';
import { haversineDistanceMeters, CAHUL_CENTER } from './geo';

export type GpsStatus = 'unsupported' | 'prompt' | 'requesting' | 'active' | 'denied' | 'error';
export type GpsTrackingMode = 'REAL' | 'CAHUL_PROJECTION';

export interface LocationState {
  lat: number;
  lng: number;
  rawLat: number;
  rawLng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  timestamp: number;
  isInsideCahulRegion: boolean;
  distanceFromCahulKm: number;
}

interface UseRealtimeLocationProps {
  enabled: boolean;
  onLocationUpdate?: (lat: number, lng: number, accuracy: number) => void;
  updateIntervalMs?: number;
}

export function useRealtimeLocation({
  enabled,
  onLocationUpdate,
  updateIntervalMs = 1500,
}: UseRealtimeLocationProps) {
  const [status, setStatus] = useState<GpsStatus>('prompt');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationState | null>(null);
  const [mode, setMode] = useState<GpsTrackingMode>('REAL');

  // Stable references for props and values to prevent infinite render loops
  const onLocationUpdateRef = useRef(onLocationUpdate);
  useEffect(() => {
    onLocationUpdateRef.current = onLocationUpdate;
  });

  const modeRef = useRef<GpsTrackingMode>(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const statusRef = useRef<GpsStatus>(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const watchIdRef = useRef<number | null>(null);
  const lastEmitTimeRef = useRef<number>(0);
  const lastEmitCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  // Calibration origin for projection mode (maps remote physical movement onto Cahul)
  const initialPhysicalOriginRef = useRef<{ lat: number; lng: number } | null>(null);
  const virtualCahulOriginRef = useRef<{ lat: number; lng: number }>({
    lat: CAHUL_CENTER.lat,
    lng: CAHUL_CENTER.lng,
  });

  // Check initial permission status if supported
  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setStatus('unsupported');
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((result) => {
          const syncStatus = (st: PermissionState) => {
            if (st === 'granted') {
              setStatus((prev) => (prev === 'active' ? prev : 'active'));
            } else if (st === 'denied') {
              setStatus('denied');
            } else {
              setStatus((prev) => (prev === 'active' ? prev : 'prompt'));
            }
          };

          syncStatus(result.state);
          result.onchange = () => syncStatus(result.state);
        })
        .catch(() => {
          // Permissions API might fail in restricted iframe environments
          setStatus((prev) => (prev === 'active' ? prev : 'prompt'));
        });
    }
  }, []);

  // Internal handler for position updates
  const handlePositionSuccessRef = useRef<(pos: GeolocationPosition) => void>(() => {});
  handlePositionSuccessRef.current = (pos: GeolocationPosition) => {
    const rawLat = pos.coords.latitude;
    const rawLng = pos.coords.longitude;
    const accuracy = Math.round(pos.coords.accuracy);
    const heading = pos.coords.heading;
    const speed = pos.coords.speed;
    const timestamp = pos.timestamp;

    const distFromCahulMeters = haversineDistanceMeters(rawLat, rawLng, CAHUL_CENTER.lat, CAHUL_CENTER.lng);
    const distFromCahulKm = Math.round(distFromCahulMeters / 100) / 10;
    const isInsideCahulRegion = distFromCahulKm <= 20;

    const currentMode = modeRef.current;
    let effectiveLat = rawLat;
    let effectiveLng = rawLng;

    if (currentMode === 'CAHUL_PROJECTION' || (!isInsideCahulRegion && currentMode === 'REAL' && initialPhysicalOriginRef.current)) {
      if (!initialPhysicalOriginRef.current) {
        initialPhysicalOriginRef.current = { lat: rawLat, lng: rawLng };
      }
      const deltaLat = rawLat - initialPhysicalOriginRef.current.lat;
      const deltaLng = rawLng - initialPhysicalOriginRef.current.lng;

      effectiveLat = virtualCahulOriginRef.current.lat + deltaLat;
      effectiveLng = virtualCahulOriginRef.current.lng + deltaLng;
    } else if (!isInsideCahulRegion && !initialPhysicalOriginRef.current) {
      initialPhysicalOriginRef.current = { lat: rawLat, lng: rawLng };
    }

    const newLoc: LocationState = {
      lat: effectiveLat,
      lng: effectiveLng,
      rawLat,
      rawLng,
      accuracy,
      heading,
      speed,
      timestamp,
      isInsideCahulRegion,
      distanceFromCahulKm: distFromCahulKm,
    };

    setLocation(newLoc);
    setStatus('active');
    setErrorMessage(null);

    // Throttle network dispatch to server
    const now = Date.now();
    const timeSinceLastEmit = now - lastEmitTimeRef.current;
    const hasMoved =
      !lastEmitCoordsRef.current ||
      haversineDistanceMeters(
        lastEmitCoordsRef.current.lat,
        lastEmitCoordsRef.current.lng,
        effectiveLat,
        effectiveLng
      ) >= 1.5;

    if (onLocationUpdateRef.current && (timeSinceLastEmit >= updateIntervalMs || hasMoved)) {
      lastEmitTimeRef.current = now;
      lastEmitCoordsRef.current = { lat: effectiveLat, lng: effectiveLng };
      onLocationUpdateRef.current(effectiveLat, effectiveLng, accuracy);
    }
  };

  const handlePositionErrorRef = useRef<(err: GeolocationPositionError) => void>(() => {});
  handlePositionErrorRef.current = (err: GeolocationPositionError) => {
    let msg = 'Unable to retrieve your location.';
    if (err.code === err.PERMISSION_DENIED) {
      setStatus('denied');
      msg = 'Location access was denied. Please allow location in your browser settings to play.';
    } else if (err.code === err.POSITION_UNAVAILABLE) {
      setStatus('error');
      msg = 'Location signal unavailable. Make sure your device GPS is on.';
    } else if (err.code === err.TIMEOUT) {
      setStatus('error');
      msg = 'Location request timed out. Retrying...';
    }
    setErrorMessage(msg);
  };

  // Start watching position (stable callback)
  const startWatching = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setStatus('unsupported');
      return;
    }

    // If already watching, do not recreate watcher
    if (watchIdRef.current !== null) {
      return;
    }

    if (statusRef.current !== 'active') {
      setStatus('requesting');
    }
    setErrorMessage(null);

    try {
      const id = navigator.geolocation.watchPosition(
        (pos) => handlePositionSuccessRef.current(pos),
        (err) => handlePositionErrorRef.current(err),
        {
          enableHighAccuracy: true,
          maximumAge: 2000,
          timeout: 15000,
        }
      );
      watchIdRef.current = id;
    } catch (e: any) {
      setStatus('error');
      setErrorMessage(e?.message || 'Failed to start GPS tracking.');
    }
  }, []);

  // Stop watching (stable callback)
  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Request permission explicitly (prompting user)
  const requestPermission = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setStatus('unsupported');
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    setStatus('requesting');
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handlePositionSuccessRef.current(pos);
        startWatching();
      },
      (err) => {
        handlePositionErrorRef.current(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, [startWatching]);

  // Recalibrate virtual origin to a spot in Cahul
  const calibrateOriginToCahul = useCallback((cahulTargetLat = CAHUL_CENTER.lat, cahulTargetLng = CAHUL_CENTER.lng) => {
    if (location) {
      initialPhysicalOriginRef.current = { lat: location.rawLat, lng: location.rawLng };
    }
    virtualCahulOriginRef.current = { lat: cahulTargetLat, lng: cahulTargetLng };
    setMode('CAHUL_PROJECTION');
  }, [location]);

  // Set mode directly
  const switchMode = useCallback((newMode: GpsTrackingMode) => {
    setMode(newMode);
    if (newMode === 'CAHUL_PROJECTION' && location && !initialPhysicalOriginRef.current) {
      initialPhysicalOriginRef.current = { lat: location.rawLat, lng: location.rawLng };
    }
  }, [location]);

  // Sync with enabled state ONLY when enabled boolean changes
  useEffect(() => {
    if (enabled) {
      startWatching();
    } else {
      stopWatching();
    }
    return () => {
      stopWatching();
    };
  }, [enabled, startWatching, stopWatching]);

  return {
    status,
    errorMessage,
    location,
    mode,
    requestPermission,
    startWatching,
    stopWatching,
    calibrateOriginToCahul,
    switchMode,
  };
}
