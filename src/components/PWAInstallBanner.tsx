import React, { useState } from 'react';
import { Download, Share2, PlusSquare, X, Smartphone, CheckCircle } from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';

export const PWAInstallBanner: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // If already installed or user dismissed the banner, don't show full banner
  if (isInstalled || dismissed) {
    return null;
  }

  // If compact mode is requested (e.g., in a navbar or header)
  if (compact) {
    if (isInstallable) {
      return (
        <button
          id="btn-pwa-install-compact"
          onClick={install}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-black tracking-wide shadow-md transition active:scale-95"
          title="Install Cahul Hunt App"
        >
          <Download className="w-3.5 h-3.5" />
          <span>INSTALL APP</span>
        </button>
      );
    }
    if (isIOS) {
      return (
        <>
          <button
            id="btn-pwa-ios-compact"
            onClick={() => setShowIOSModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-400 border border-amber-500/30 text-xs font-bold transition active:scale-95"
            title="Install on iPhone"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>INSTALL (iOS)</span>
          </button>

          {showIOSModal && (
            <div className="fixed inset-0 z-999 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-neutral-900 border border-neutral-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-black text-xs">
                      CH
                    </div>
                    <h3 className="font-bold text-white text-base">Install on iPhone / iPad</h3>
                  </div>
                  <button
                    onClick={() => setShowIOSModal(false)}
                    className="p-1 rounded-lg text-neutral-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-sm text-neutral-300">
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="p-2 rounded-lg bg-neutral-800 text-amber-400 shrink-0">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">1. Tap Safari Share</p>
                      <p className="text-xs text-neutral-400">At the bottom bar of your iPhone screen.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="p-2 rounded-lg bg-neutral-800 text-amber-400 shrink-0">
                      <PlusSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">2. Select &ldquo;Add to Home Screen&rdquo;</p>
                      <p className="text-xs text-neutral-400">Scroll down the menu and tap Add to Home Screen.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">3. Launch Fullscreen Game</p>
                      <p className="text-xs text-neutral-400">Enjoy offline-ready GPS radar and zero address bar interference!</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowIOSModal(false)}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm transition active:scale-98"
                >
                  GOT IT
                </button>
              </div>
            </div>
          )}
        </>
      );
    }
    return null;
  }

  // Full banner mode (e.g. at top of Home / Register / Lobby screens)
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      <div className="w-full bg-gradient-to-r from-amber-600/20 via-neutral-900 to-amber-950/40 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-lg shadow-amber-950/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-black font-black shadow-md shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">Mobile Phone App</h4>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">PWA</span>
            </div>
            <p className="text-xs text-neutral-300">
              Install for fullscreen GPS radar, haptic alerts &amp; real-time field tracking.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isInstallable ? (
            <button
              id="btn-pwa-install-banner"
              onClick={install}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black tracking-wide shadow-md transition active:scale-95 whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>INSTALL</span>
            </button>
          ) : isIOS ? (
            <button
              id="btn-pwa-ios-banner"
              onClick={() => setShowIOSModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black tracking-wide shadow-md transition active:scale-95 whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>INSTALL</span>
            </button>
          ) : null}

          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white transition"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showIOSModal && (
        <div className="fixed inset-0 z-999 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-black text-xs">
                  CH
                </div>
                <h3 className="font-bold text-white text-base">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-neutral-300">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="p-2 rounded-lg bg-neutral-800 text-amber-400 shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-white">1. Tap Safari Share</p>
                  <p className="text-xs text-neutral-400">At the bottom bar of your iPhone screen.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="p-2 rounded-lg bg-neutral-800 text-amber-400 shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-white">2. Select &ldquo;Add to Home Screen&rdquo;</p>
                  <p className="text-xs text-neutral-400">Scroll down the menu and tap Add to Home Screen.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-white">3. Launch Fullscreen Game</p>
                  <p className="text-xs text-neutral-400">Enjoy offline-ready GPS radar and zero address bar interference!</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm transition active:scale-98"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}
    </>
  );
};
