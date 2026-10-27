/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Download, Share2, Smartphone, Monitor, CheckCircle, Package } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'header' | 'sidebar' | 'inline' }> = ({
  variant = 'header',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);

  const isAndroid =
    typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

  // If already running as an installed PWA, show badge
  if (isInstalled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Installed Android App
      </span>
    );
  }

  // Direct Browser Prompt flow
  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        setShowAndroidGuide(true);
      }
    } else {
      setShowAndroidGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={
          variant === 'sidebar'
            ? 'flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 active:scale-98 transition'
            : 'flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-800 active:scale-98 transition'
        }
        title="Install Android App"
      >
        <Smartphone className="w-4 h-4 shrink-0 text-blue-200" />
        <span>{isAndroid ? 'Install Android App' : 'Install App'}</span>
      </button>

      {/* Android & APK Installation Modal */}
      {showAndroidGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-blue-900 mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Install on Android Device
                </h3>
                <p className="text-xs text-slate-500">
                  Full standalone app with offline database access
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-700">
              {/* Option 1: Direct 1-Tap Home Screen App */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
                  <CheckCircle className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>Instant 1-Tap Install (Recommended)</span>
                </div>
                <p className="text-slate-600 leading-relaxed pl-5">
                  1. Tap the three dots menu (<strong>⋮</strong>) in Google Chrome on your Android phone.<br />
                  2. Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.<br />
                  3. The app will install with its own icon in your Android app drawer, launch in full screen (no browser address bar), and work 100% offline.
                </p>
              </div>

              {/* Option 2: Standalone .APK / Play Store Bundle */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                  <Package className="w-4 h-4 text-slate-600 shrink-0" />
                  <span>Native Android .APK Package</span>
                </div>
                <p className="text-slate-600 leading-relaxed pl-5">
                  This app includes pre-configured <strong>twa-manifest.json</strong> and <strong>.well-known/assetlinks.json</strong> for Google's official Bubblewrap tool:
                </p>
                <div className="bg-slate-900 text-slate-100 p-2 rounded-md font-mono text-[11px] mt-1 ml-5">
                  npx @bubblewrap/cli build
                </div>
                <p className="text-[11px] text-slate-500 pl-5 pt-1">
                  Or enter this web app URL into <strong className="text-slate-700">PWABuilder.com</strong> to download an instant signed Android APK!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAndroidGuide(false)}
              className="mt-5 w-full rounded-lg bg-blue-700 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-blue-800 transition"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* iOS Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-blue-900 mb-3">
              <Share2 className="w-6 h-6 text-blue-700" />
              <h3 className="text-base font-bold">Install on iPhone / iPad</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Add <strong>Tangkhul Village Directory</strong> to your Home Screen for instant offline access:
            </p>
            <ol className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-700">1.</span>
                <span>Tap the <strong>Share</strong> button in Safari toolbar.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-700">2.</span>
                <span>Scroll down and tap <strong>Add to Home Screen</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-700">3.</span>
                <span>Tap <strong>Add</strong> to complete.</span>
              </li>
            </ol>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-lg bg-blue-700 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
