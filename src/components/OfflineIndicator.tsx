/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { WifiOff, Database } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:right-auto z-50 flex items-center gap-3 rounded-lg bg-amber-600 px-4 py-2.5 text-xs sm:text-sm font-medium text-white shadow-xl animate-bounce-subtle">
      <WifiOff className="w-4 h-4 shrink-0 text-amber-100" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
        <span>Offline Mode Active</span>
        <span className="text-amber-100 text-xs flex items-center gap-1">
          <Database className="w-3 h-3" />
          Reading & saving seamlessly to local IndexedDB
        </span>
      </div>
    </div>
  );
};
