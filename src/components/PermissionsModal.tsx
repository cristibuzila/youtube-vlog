import React, { useState } from 'react';
import { MapPin, Camera, Bell, Shield, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { GpsStatus } from '../utils/useRealtimeLocation';

interface PermissionsModalProps {
  isOpen: boolean;
  gpsStatus: GpsStatus;
  onRequestGPS: () => void;
  onComplete: () => void;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  isOpen,
  gpsStatus,
  onRequestGPS,
  onComplete,
}) => {
  const [cameraGranted, setCameraGranted] = useState<boolean>(false);
  const [notificationsGranted, setNotificationsGranted] = useState<boolean>(false);
  const [photosGranted, setPhotosGranted] = useState<boolean>(true); // Web file picker always accessible

  if (!isOpen) return null;

  const requestCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Stop tracks immediately after getting permission
        stream.getTracks().forEach((track) => track.stop());
        setCameraGranted(true);
      } else {
        setCameraGranted(true);
      }
    } catch {
      setCameraGranted(false);
    }
  };

  const requestNotifications = async () => {
    try {
      if ('Notification' in window) {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          setNotificationsGranted(true);
        }
      } else {
        setNotificationsGranted(true);
      }
    } catch {
      setNotificationsGranted(false);
    }
  };

  const handleGrantAll = async () => {
    onRequestGPS();
    await requestCamera();
    await requestNotifications();
  };

  const isLocationGranted = gpsStatus === 'active';

  return (
    <div className="fixed inset-0 z-500 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="text-center space-y-1">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl mx-auto text-amber-400 mb-2">
            📍
          </div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase">
            STEP 2 OF 2 • SENSOR SETUP
          </span>
          <h2 className="text-2xl font-black text-white font-display">
            DEVICE PERMISSIONS
          </h2>
          <p className="text-xs text-neutral-400">
            <span className="font-bold text-amber-400">Location is essential</span> because Cahul Hunt is an outdoor GPS Hide & Seek competition.
          </p>
        </div>

        {/* Permissions List */}
        <div className="space-y-2.5">
          {/* 1. Location (Essential) */}
          <div className={`p-3.5 rounded-2xl border transition flex items-center justify-between ${
            isLocationGranted
              ? 'bg-emerald-950/40 border-emerald-500/60'
              : gpsStatus === 'denied'
              ? 'bg-rose-950/40 border-rose-500/60'
              : 'bg-neutral-950 border-neutral-800'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isLocationGranted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-900 text-amber-400'
              }`}>
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>GPS Location</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase">
                    Essential
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400">
                  {isLocationGranted
                    ? '✓ Real-time GPS tracking enabled'
                    : gpsStatus === 'denied'
                    ? 'Permission was denied in browser'
                    : 'Needed to place you inside the Cahul arena'}
                </div>
              </div>
            </div>

            <button
              onClick={onRequestGPS}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                isLocationGranted
                  ? 'bg-emerald-500 text-black font-black'
                  : 'bg-amber-500 hover:bg-amber-400 text-black'
              }`}
            >
              {isLocationGranted ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{isLocationGranted ? 'Allowed' : 'Allow'}</span>
            </button>
          </div>

          {/* 2. Camera */}
          <div className={`p-3 rounded-2xl border transition flex items-center justify-between ${
            cameraGranted ? 'bg-emerald-950/40 border-emerald-500/60' : 'bg-neutral-950 border-neutral-800'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center text-neutral-300">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Camera & Video</div>
                <div className="text-[11px] text-neutral-400">For Bingo landmark selfies and evidence</div>
              </div>
            </div>

            <button
              onClick={requestCamera}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                cameraGranted ? 'bg-emerald-500 text-black font-black' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
              }`}
            >
              {cameraGranted ? 'Allowed' : 'Allow'}
            </button>
          </div>

          {/* 3. Notifications */}
          <div className={`p-3 rounded-2xl border transition flex items-center justify-between ${
            notificationsGranted ? 'bg-emerald-950/40 border-emerald-500/60' : 'bg-neutral-950 border-neutral-800'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center text-neutral-300">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Notifications</div>
                <div className="text-[11px] text-neutral-400">Alerts when Seeker is nearby or boundaries shrink</div>
              </div>
            </div>

            <button
              onClick={requestNotifications}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                notificationsGranted ? 'bg-emerald-500 text-black font-black' : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
              }`}
            >
              {notificationsGranted ? 'Allowed' : 'Allow'}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          {!isLocationGranted && (
            <button
              onClick={handleGrantAll}
              className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs tracking-wider uppercase transition shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Shield className="w-4 h-4" />
              <span>GRANT ALL PERMISSIONS</span>
            </button>
          )}

          <button
            onClick={onComplete}
            className="w-full py-3.5 px-4 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs tracking-wider uppercase transition border border-neutral-700 active:scale-95 flex items-center justify-center gap-1.5"
          >
            <span>CONTINUE TO GAME LOBBY</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
