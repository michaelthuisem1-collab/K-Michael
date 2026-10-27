/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  HardDrive,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Smartphone,
  Info,
  Database,
  Lock,
} from 'lucide-react';
import { RegionKey, StorageInfo, ViewMode, VillageRecord } from '../types/village';
import { clearAllVillages, getStorageInfo } from '../services/db';

interface SettingsProps {
  onClearAll: () => Promise<void>;
  defaultRegion: RegionKey | 'all';
  onSetDefaultRegion: (region: RegionKey | 'all') => void;
  defaultViewMode: ViewMode;
  onSetDefaultViewMode: (viewMode: ViewMode) => void;
  villages: VillageRecord[];
}

export const Settings: React.FC<SettingsProps> = ({
  onClearAll,
  defaultRegion,
  onSetDefaultRegion,
  defaultViewMode,
  onSetDefaultViewMode,
  villages,
}) => {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [clearError, setClearError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  useEffect(() => {
    loadStorageInfo();
  }, [villages]);

  const loadStorageInfo = async () => {
    try {
      const info = await getStorageInfo();
      setStorageInfo(info);
    } catch (err) {
      console.error('Storage info error:', err);
    }
  };

  const handleClearDatabase = async () => {
    if (confirmInput.trim().toUpperCase() !== 'DELETE ALL') {
      setClearError('Please type "DELETE ALL" exactly to confirm.');
      return;
    }

    try {
      await onClearAll();
      setShowClearConfirm(false);
      setConfirmInput('');
      setClearError('');
      setSuccessNotice('All local records have been purged.');
      setTimeout(() => setSuccessNotice(''), 5000);
    } catch (err: any) {
      setClearError(err?.message || 'Failed to clear data.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Application & Storage Settings
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure default viewing preferences, monitor offline storage health, and review data privacy.
        </p>
      </div>

      {successNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Viewing Preferences */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          Default Display Preferences
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Default Region Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Default Region on Startup
            </label>
            <select
              value={defaultRegion}
              onChange={(e) => {
                onSetDefaultRegion(e.target.value as any);
                localStorage.setItem('tangkhul_default_region', e.target.value);
              }}
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 focus:bg-white focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
            >
              <option value="all">All Regions (All 4 Zones)</option>
              <option value="North">North — Ato</option>
              <option value="East">East — Zingsho</option>
              <option value="West">West — Zingtun</option>
              <option value="South">South — Aze</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Initial filter applied when opening the directory page.
            </p>
          </div>

          {/* Default View Mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Default Layout Mode
            </label>
            <select
              value={defaultViewMode}
              onChange={(e) => {
                onSetDefaultViewMode(e.target.value as any);
                localStorage.setItem('tangkhul_default_view', e.target.value);
              }}
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 focus:bg-white focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
            >
              <option value="table">Table View (Dense, Multi-column)</option>
              <option value="cards">Card Grid View (Mobile-Friendly)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Preferred visual style for browsing village listings.
            </p>
          </div>
        </div>
      </div>

      {/* Storage Information */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-blue-700" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Local Storage & Persistence Status
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <span className="block text-slate-500">Storage Engine</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-600" />
              IndexedDB (Active)
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <span className="block text-slate-500">Stored Records</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">
              {storageInfo?.count ?? villages.length} Villages
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <span className="block text-slate-500">Last Backup Created</span>
            <span className="text-sm font-bold text-slate-900 mt-0.5 block">
              {storageInfo?.lastBackupDate
                ? new Date(storageInfo.lastBackupDate).toLocaleDateString()
                : 'Never'}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-900 space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <Info className="w-4 h-4 text-blue-700" />
            Storage Lifecycle Information
          </p>
          <p className="text-slate-600 leading-relaxed">
            Data is stored directly in your browser's local IndexedDB database. It remains available across refreshes, system restarts, and when offline. Note: Clearing your browser's cookies and site data for this domain will erase local records, so exporting regular JSON backups is recommended.
          </p>
        </div>
      </div>

      {/* Privacy and Data Protection Notice */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Privacy & Data Protection
          </h3>
        </div>

        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>
            • <strong>Private Operational Data:</strong> Village records and contact numbers are treated as private directory records. No analytics, tracking scripts, or telemetry are present in this application.
          </p>
          <p>
            • <strong>No External Network Transmissions:</strong> Records stay strictly on your device inside IndexedDB. No contact numbers or personal information are sent to external cloud servers.
          </p>
          <p className="flex items-start gap-1 text-slate-500">
            <Lock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
            <span>
              Standard browser IndexedDB storage is sandboxed to this web origin, but is not hardware-encrypted by default. Keep personal access secure on shared computers.
            </span>
          </p>
        </div>
      </div>

      {/* PWA & Mobile Installation Guide */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-blue-700" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Installation & Offline Access
          </h3>
        </div>

        <div className="space-y-2 text-xs text-slate-600">
          <p>
            This Progressive Web App (PWA) operates with service worker caching. After opening the app once, you can access the directory even when in remote areas without an active internet or cellular connection.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <h4 className="font-bold text-slate-800 mb-1">On Android (Chrome / Firefox)</h4>
              <p className="text-[11px] text-slate-500">
                Tap Menu (⋮) → "Install app" or "Add to Home screen". The app will appear in your device's app drawer and home screen like a native app.
              </p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <h4 className="font-bold text-slate-800 mb-1">On iPhone / iPad (Safari)</h4>
              <p className="text-[11px] text-slate-500">
                Tap the Share icon in the bottom Safari bar, scroll down and tap "Add to Home Screen".
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone: Clear All Records */}
      <div className="bg-white border border-rose-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Danger Zone: Clear All Records</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Permanently purges all village records from IndexedDB storage. You can restore from a JSON backup file or re-seed the default 233 records at any time.
            </p>
          </div>

          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-3.5 py-2 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-300 text-xs font-semibold transition shrink-0"
          >
            Clear Database
          </button>
        </div>

        {/* Clear Confirmation Modal / Box */}
        {showClearConfirm && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-300 space-y-3">
            <div className="flex items-start gap-2.5 text-xs text-rose-900">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Warning: Irreversible Local Data Deletion</p>
                <p className="mt-1 text-rose-800">
                  This will remove all <strong>{villages.length} records</strong> currently stored in your browser. To prevent accidental loss, type <strong>DELETE ALL</strong> in the box below to proceed.
                </p>
              </div>
            </div>

            <div className="max-w-xs space-y-1">
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Type DELETE ALL"
                className="w-full text-xs uppercase bg-white border border-rose-300 rounded-lg p-2 focus:ring-2 focus:ring-rose-600 focus:outline-hidden"
              />
              {clearError && <p className="text-xs text-rose-700 font-semibold">{clearError}</p>}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  setShowClearConfirm(false);
                  setConfirmInput('');
                  setClearError('');
                }}
                className="px-3.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleClearDatabase}
                className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold transition shadow-xs"
              >
                Permanently Delete Data
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
