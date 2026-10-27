/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  FolderTree,
  PlusCircle,
  ArrowUpDown,
  Settings,
  X,
  Compass,
} from 'lucide-react';
import { RegionKey } from '../types/village';

export type ActivePage = 'dashboard' | 'directory' | 'add' | 'import-export' | 'settings';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activePage: ActivePage;
  onNavigate: (page: ActivePage, regionFilter?: RegionKey | 'all') => void;
  regionCounts: Record<RegionKey, number>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activePage,
  onNavigate,
  regionCounts,
}) => {
  const navItems: { id: ActivePage; label: string; icon: React.ReactNode }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'directory',
      label: 'Village Directory',
      icon: <FolderTree className="w-5 h-5" />,
    },
    {
      id: 'add',
      label: 'Add New Village',
      icon: <PlusCircle className="w-5 h-5" />,
    },
    {
      id: 'import-export',
      label: 'Data Import / Export',
      icon: <ArrowUpDown className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  const regions: { key: RegionKey; label: string; longphang: string }[] = [
    { key: 'North', label: 'North', longphang: 'Ato' },
    { key: 'East', label: 'East', longphang: 'Zingsho' },
    { key: 'West', label: 'West', longphang: 'Zingtun' },
    { key: 'South', label: 'South', longphang: 'Aze' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static lg:translate-x-0 lg:z-10`}
      >
        {/* Drawer Header (Mobile Close) */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 lg:hidden">
          <span className="font-bold text-slate-800 text-sm tracking-wide">
            NAVIGATION
          </span>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-md hover:bg-slate-100 transition"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-800 font-semibold border-l-4 border-blue-700'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span className={isActive ? 'text-blue-700' : 'text-slate-500'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Regional Sections Shortcut */}
          <div className="pt-3 border-t border-slate-100">
            <div className="px-3 mb-2 flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span>Regions / Longphang</span>
              <Compass className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="space-y-1">
              {regions.map((reg) => (
                <button
                  key={reg.key}
                  onClick={() => {
                    onNavigate('directory', reg.key);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-800 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600/70" />
                    <span>
                      {reg.label} — {reg.longphang}
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-semibold">
                    {regionCounts[reg.key] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Database & PWA Info Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 text-xs text-slate-500">
          <p className="font-semibold text-slate-700">Tangkhul Village Register</p>
          <p className="mt-0.5">IndexedDB Persistent Store</p>
          <p className="text-[11px] text-slate-400 mt-1">Local & Offline Ready</p>
        </div>
      </aside>
    </>
  );
};
