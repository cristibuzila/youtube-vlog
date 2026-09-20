import React, { useState } from 'react';
import { GpsStatus, LocationState, GpsTrackingMode } from '../utils/useRealtimeLocation';
import { Navigation, AlertTriangle, CheckCircle2, RefreshCw, Compass, MapPin } from 'lucide-react';

interface GpsPermissionBannerProps {
  status: GpsStatus;
  errorMessage: string | null;
  location: LocationState | null;
  mode: GpsTrackingMode;
  onRequestPermission: () => void;
  onSwitchMode: (mode: GpsTrackingMode) => void;
  onCalibrate: () => void;
  compact?: boolean;
}

export const GpsPermissionBanner: React.FC<GpsPermissionBannerProps> = ({
  status,
  errorMessage,
  location,
  mode,
  onRequestPermission,
  onSwitchMode,
  onCalibrate,
  compact = false,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Status: ACTIVE
  if (status === 'active' && location) {
    if (compact) {
      return (
        <div className="inline-flex items-center gap-2 bg-neutral-900/90 border border-neutral-800 backdrop-blur-md px-2.5 py-1 rounded-xl text-xs font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-emerald-400 font-bold">GPS ACTIVE</span>
          <span className="text-neutral-500">•</span>
          <span className="text-neutral-300">±{location.accuracy}m</span>
          {!location.isInsideCahulRegion && (
            <button
              onClick={() => onSwitchMode(mode === 'REAL' ? 'CAHUL_PROJECTION' : 'REAL')}
              className={`ml-1 text-[10px] px-1.5 py-0.5 rounded ${
                mode === 'CAHUL_PROJECTION'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-neutral-800 text-neutral-400'
              }`}
              title="Toggle Cahul Arena projection for remote testing"
            >
              {mode === 'CAHUL_PROJECTION' ? 'Cahul Mode' : 'Raw GPS'}
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="w-full bg-neutral-900/90 border-b border-neutral-800 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-bold text-emerald-400 flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5" />
            <span>REAL-TIME GPS:</span>
          </span>
          <span className="text-neutral-200">
            {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
          </span>
          <span className="text-neutral-400">(±{location.accuracy}m accuracy)</span>
        </div>

        <div className="flex items-center gap-2">
          {!location.isInsideCahulRegion && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-amber-400">
                Remote ({location.distanceFromCahulKm}km from Cahul):
              </span>
              <button
                onClick={() => onSwitchMode('CAHUL_PROJECTION')}
                className={`px-2 py-0.5 rounded-lg font-mono font-bold transition ${
                  mode === 'CAHUL_PROJECTION'
                    ? 'bg-amber-500 text-black'
                    : 'bg-neutral-800 text-neutral-300 hover:text-white'
                }`}
              >
                Project to Cahul
              </button>
              <button
                onClick={() => onSwitchMode('REAL')}
                className={`px-2 py-0.5 rounded-lg font-mono font-bold transition ${
                  mode === 'REAL'
                    ? 'bg-amber-500 text-black'
                    : 'bg-neutral-800 text-neutral-300 hover:text-white'
                }`}
              >
                Raw GPS
              </button>
            </div>
          )}

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-neutral-400 hover:text-white underline text-[11px]"
          >
            {showDetails ? 'Hide' : 'Sensor Info'}
          </button>
        </div>

        {showDetails && (
          <div className="w-full pt-1.5 mt-1 border-t border-neutral-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-neutral-400">
            <div>Speed: {location.speed ? `${(location.speed * 3.6).toFixed(1)} km/h` : 'Stationary'}</div>
            <div>Heading: {location.heading ? `${Math.round(location.heading)}°` : 'N/A'}</div>
            <div>Raw GPS: {location.rawLat.toFixed(4)}, {location.rawLng.toFixed(4)}</div>
            <div>Mode: {mode === 'CAHUL_PROJECTION' ? 'Cahul Calibrated (1:1 Walk)' : 'Direct Device GPS'}</div>
          </div>
        )}
      </div>
    );
  }

  // Status: DENIED
  if (status === 'denied') {
    return (
      <div className="w-full bg-rose-950/90 border-b border-rose-800 px-4 py-3 text-xs flex flex-wrap items-center justify-between gap-2 shadow-lg">
        <div className="flex items-center gap-2 text-rose-200">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <div>
            <span className="font-bold">GPS Permission Denied in Browser: </span>
            <span>{errorMessage || 'Cahul Hunt needs your location to track you on the live map.'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRequestPermission}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1 transition text-xs"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry Permission</span>
          </button>
        </div>
      </div>
    );
  }

  // Status: REQUESTING
  if (status === 'requesting') {
    return (
      <div className="w-full bg-amber-950/90 border-b border-amber-800 px-4 py-2.5 text-xs flex items-center justify-between gap-2 shadow-lg animate-pulse">
        <div className="flex items-center gap-2 text-amber-200">
          <Navigation className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
          <span>Acquiring high-precision GPS satellite fix from device...</span>
        </div>
        <span className="text-[11px] text-amber-400 font-mono">Please accept browser prompt</span>
      </div>
    );
  }

  // Status: PROMPT or IDLE
  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/30 px-4 py-3 text-xs flex flex-wrap items-center justify-between gap-3 shadow-md backdrop-blur-md">
      <div className="flex items-center gap-2.5 text-neutral-200">
        <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
          <MapPin className="w-4 h-4" />
        </div>
        <div>
          <div className="font-bold text-white text-xs sm:text-sm">
            Real-Time GPS Location Tracking Required
          </div>
          <div className="text-neutral-400 text-[11px] mt-0.5">
            Cahul Hunt tracks your real-life movement in Cahul for Hide & Seek, Seeker alerts, and Bingo spots.
          </div>
        </div>
      </div>

      <button
        id="btn-grant-gps-permission"
        onClick={onRequestPermission}
        className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs tracking-wider uppercase shadow-lg shadow-amber-500/20 transition active:scale-95 flex items-center gap-1.5 shrink-0"
      >
        <Navigation className="w-3.5 h-3.5 fill-current" />
        <span>ENABLE GPS LOCATION</span>
      </button>
    </div>
  );
};
