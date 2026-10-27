/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AlertCircle, Download, X } from 'lucide-react';
import { getAllVillages, getLastBackupDate, getLastModifiedDate, markBackupSaved } from '../services/db';

interface BackupReminderProps {
  onExportTriggered?: () => void;
}

export const BackupReminderBanner: React.FC<BackupReminderProps> = ({ onExportTriggered }) => {
  const [show, setShow] = useState<boolean>(false);
  const [reason, setReason] = useState<string>('');
  const [dismissed, setDismissed] = useState<boolean>(false);

  useEffect(() => {
    checkBackupStatus();
  }, []);

  const checkBackupStatus = () => {
    if (dismissed) return;

    const lastBackup = getLastBackupDate();
    const lastModified = getLastModifiedDate();

    if (!lastBackup) {
      setReason('No local backup has been created yet. Save an offline copy of your directory records.');
      setShow(true);
      return;
    }

    if (lastModified && new Date(lastModified) > new Date(lastBackup)) {
      setReason('You have unsaved changes since your last backup. Keep your records safe.');
      setShow(true);
      return;
    }

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    if (new Date(lastBackup).getTime() < sevenDaysAgo) {
      setReason('Your last backup was over a week ago. Creating periodic backups is recommended.');
      setShow(true);
      return;
    }

    setShow(false);
  };

  const handleQuickBackup = async () => {
    try {
      const records = await getAllVillages();
      const payload = {
        version: 1,
        appName: 'Tangkhul Village Directory',
        exportedAt: new Date().toISOString(),
        totalRecords: records.length,
        records,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement('a');
      const filename = `tangkhul-village-backup-${new Date().toISOString().slice(0, 10)}.json`;
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      markBackupSaved();
      setShow(false);
      if (onExportTriggered) onExportTriggered();
    } catch (err) {
      console.error('Backup error:', err);
    }
  };

  if (!show || dismissed) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-amber-900 font-medium">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{reason}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            onClick={handleQuickBackup}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Backup</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-amber-700 hover:text-amber-900 rounded-md transition"
            title="Dismiss for this session"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
