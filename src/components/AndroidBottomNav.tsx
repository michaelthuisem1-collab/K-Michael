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
} from 'lucide-react';
import { ActivePage } from './Sidebar';

interface AndroidBottomNavProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  villageCount: number;
}

export const AndroidBottomNav: React.FC<AndroidBottomNavProps> = ({
  activePage,
  onNavigate,
}) => {
  const tabs: { id: ActivePage; label: string; icon: React.ReactNode; isAction?: boolean }[] = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'directory',
      label: 'Villages',
      icon: <FolderTree className="w-5 h-5" />,
    },
    {
      id: 'add',
      label: 'Add',
      icon: <PlusCircle className="w-6 h-6" />,
      isAction: true,
    },
    {
      id: 'import-export',
      label: 'Backup',
      icon: <ArrowUpDown className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-lg px-2 py-1.5 flex items-center justify-around select-none"
      style={{ paddingBottom: 'max(0.375rem, env(safe-area-inset-bottom))' }}
      aria-label="Android Bottom Navigation"
    >
      {tabs.map((tab) => {
        const isActive = activePage === tab.id;

        if (tab.isAction) {
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className="flex flex-col items-center justify-center -mt-4 group focus:outline-hidden"
              aria-label="Add new village"
            >
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-md transition-transform active:scale-95 ${
                  isActive ? 'bg-blue-800 ring-4 ring-blue-100' : 'bg-blue-700 hover:bg-blue-800'
                }`}
              >
                <PlusCircle className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-slate-700 mt-1">
                {tab.label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-150 active:scale-95 ${
              isActive
                ? 'text-blue-800 font-bold'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div
              className={`px-3 py-0.5 rounded-full transition-colors ${
                isActive ? 'bg-blue-100 text-blue-800' : 'text-slate-500'
              }`}
            >
              {tab.icon}
            </div>
            <span className="text-[10px] tracking-tight mt-0.5">
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
