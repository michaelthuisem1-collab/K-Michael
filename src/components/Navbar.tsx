/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Menu, CheckCircle2, Wifi, WifiOff, BookOpen } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface NavbarProps {
  totalCount: number;
  onToggleSidebar: () => void;
  lastSavedText: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  totalCount,
  onToggleSidebar,
  lastSavedText,
}) => {
  const isOnline = useOnlineStatus();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Left Section: Menu Toggle & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-1 text-slate-700 hover:text-blue-900 hover:bg-slate-100 rounded-lg transition"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-700 flex items-center justify-center text-white shadow-sm shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                  Tangkhul Village Directory
                </h1>
                <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                  {totalCount} Villages
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Interactive Offline Progressive Web App
              </p>
            </div>
          </div>
        </div>

        {/* Right Section: Status Badges & PWA Install */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Local Persistence Saved Status */}
          <div
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-md"
            title="Records are persistently saved in local IndexedDB"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lastSavedText || 'IndexedDB Active'}</span>
          </div>

          {/* Connectivity Status */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border ${
              isOnline
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span>Offline</span>
              </>
            )}
          </div>

          {/* Install PWA Button */}
          <PWAInstallButton variant="header" />
        </div>
      </div>
    </header>
  );
};
