/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, ActivePage } from './components/Sidebar';
import { AndroidBottomNav } from './components/AndroidBottomNav';
import { BackupReminderBanner } from './components/BackupReminderBanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Dashboard } from './pages/Dashboard';
import { Directory } from './pages/Directory';
import { AddEditVillageModal } from './pages/AddEditVillageModal';
import { ImportExport } from './pages/ImportExport';
import { Settings } from './pages/Settings';
import { INITIAL_VILLAGES } from './data/initialVillages';
import {
  initDatabase,
  getAllVillages,
  saveVillage,
  deleteVillage,
  bulkUpsertVillages,
  restoreBackup,
  resetToDefaultDataset,
  clearAllVillages,
} from './services/db';
import {
  MissingInfoFilter,
  RegionKey,
  ViewMode,
  VillageRecord,
} from './types/village';
import { AlertTriangle } from 'lucide-react';

export default function App() {
  // Pre-populate with initial 233 villages immediately so the app is instantly visible on first paint
  const [villages, setVillages] = useState<VillageRecord[]>(INITIAL_VILLAGES);

  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Directory filter navigation state
  const [directoryRegionFilter, setDirectoryRegionFilter] = useState<RegionKey | 'all'>('all');
  const [directoryMissingFilter, setDirectoryMissingFilter] = useState<MissingInfoFilter>('all');

  // Handle URL shortcut params (e.g. from Android App Launcher shortcuts)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const pageParam = params.get('page') as ActivePage;
      if (pageParam && ['dashboard', 'directory', 'add', 'import-export', 'settings'].includes(pageParam)) {
        setActivePage(pageParam);
      }
    }
  }, []);

  // Preferences from localStorage
  const [defaultRegion, setDefaultRegion] = useState<RegionKey | 'all'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('tangkhul_default_region') as any) || 'all';
    }
    return 'all';
  });

  const [defaultViewMode, setDefaultViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('tangkhul_default_view') as any) || 'table';
    }
    return 'table';
  });

  // Modal states
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [selectedVillageForEdit, setSelectedVillageForEdit] = useState<VillageRecord | null>(null);

  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
  }>({
    isOpen: false,
    id: '',
    name: '',
  });

  // Saved notification
  const [lastSavedText, setLastSavedText] = useState<string>('Local Database Ready');

  // Non-blocking background load to hydrate saved modifications from IndexedDB
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const data = await initDatabase();
        if (isMounted && data && data.length > 0) {
          setVillages(data);
          setLastSavedText('Saved to local storage');
        }
      } catch (err: any) {
        console.warn('Could not sync from IndexedDB:', err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update saved status label
  const triggerSavedNotice = () => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLastSavedText(`Saved locally at ${time}`);
  };

  // Save handler (Add or Edit)
  const handleSaveVillage = async (record: VillageRecord) => {
    const saved = await saveVillage(record);
    setVillages((prev) => {
      const idx = prev.findIndex((v) => v.id === saved.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      } else {
        return [...prev, saved];
      }
    });
    triggerSavedNotice();
  };

  // Delete initiation
  const handleDeleteRequest = (id: string, name: string) => {
    setDeleteDialog({
      isOpen: true,
      id,
      name,
    });
  };

  // Delete confirmation
  const handleConfirmDelete = async () => {
    if (!deleteDialog.id) return;
    try {
      await deleteVillage(deleteDialog.id);
      setVillages((prev) => prev.filter((v) => v.id !== deleteDialog.id));
      triggerSavedNotice();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleteDialog({ isOpen: false, id: '', name: '' });
    }
  };

  // Bulk import from CSV
  const handleBulkImportVillages = async (
    incoming: VillageRecord[],
    conflictMode: 'skip' | 'update'
  ) => {
    const existing = await getAllVillages();
    const existingByName = new Map(existing.map((v) => [v.name.trim().toLowerCase(), v]));

    let added = 0;
    let updated = 0;
    let skipped = 0;

    const toUpsert: VillageRecord[] = [];

    incoming.forEach((item) => {
      const match = existingByName.get(item.name.trim().toLowerCase());
      if (match) {
        if (conflictMode === 'update') {
          toUpsert.push({
            ...match,
            votes: item.votes !== null ? item.votes : match.votes,
            president: item.president || match.president,
            contactNo: item.contactNo || match.contactNo,
            misc: item.misc || match.misc,
            updatedAt: new Date().toISOString(),
          });
          updated++;
        } else {
          skipped++;
        }
      } else {
        toUpsert.push(item);
        added++;
      }
    });

    if (toUpsert.length > 0) {
      await bulkUpsertVillages(toUpsert);
      const allUpdated = await getAllVillages();
      setVillages(allUpdated);
      triggerSavedNotice();
    }

    return { added, updated, skipped };
  };

  // Restore backup from JSON
  const handleRestoreBackup = async (records: VillageRecord[], mode: 'replace' | 'merge') => {
    await restoreBackup(records, mode);
    const updated = await getAllVillages();
    setVillages(updated);
    triggerSavedNotice();
  };

  // Reset to default dataset
  const handleResetDefault = async () => {
    const defaults = await resetToDefaultDataset();
    setVillages(defaults);
    triggerSavedNotice();
  };

  // Clear all data
  const handleClearAll = async () => {
    await clearAllVillages();
    setVillages([]);
    triggerSavedNotice();
  };

  // Navigation with filter support
  const handleNavigate = (page: ActivePage, regionFilter?: RegionKey | 'all') => {
    setActivePage(page);
    if (regionFilter !== undefined) {
      setDirectoryRegionFilter(regionFilter);
    }
  };

  const handleNavigateToDirectoryWithFilters = (
    regionFilter: RegionKey | 'all' = 'all',
    missingFilter: MissingInfoFilter = 'all'
  ) => {
    setDirectoryRegionFilter(regionFilter);
    setDirectoryMissingFilter(missingFilter);
    setActivePage('directory');
  };

  // Regional counts for navigation
  const regionCounts = useMemo(() => {
    const counts: Record<RegionKey, number> = {
      North: 0,
      East: 0,
      West: 0,
      South: 0,
    };
    villages.forEach((v) => {
      if (counts[v.region] !== undefined) {
        counts[v.region]++;
      }
    });
    return counts;
  }, [villages]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
        {/* Backup Reminder Banner */}
        <BackupReminderBanner onExportTriggered={() => triggerSavedNotice()} />

        {/* Main Navbar */}
        <Navbar
          totalCount={villages.length}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          lastSavedText={lastSavedText}
        />

        {/* App Body Layout: Sidebar + Main Content */}
        <div className="flex-1 flex max-w-7xl w-full mx-auto">
          {/* Navigation Sidebar (Desktop) */}
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            activePage={activePage}
            onNavigate={handleNavigate}
            regionCounts={regionCounts}
          />

          {/* Page Content View (with pb-24 for Android Bottom Nav) */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 overflow-y-auto max-w-full">
            {activePage === 'dashboard' && (
              <Dashboard
                villages={villages}
                onNavigateToDirectory={handleNavigateToDirectoryWithFilters}
                onOpenAddModal={() => {
                  setSelectedVillageForEdit(null);
                  setIsAddEditModalOpen(true);
                }}
                onEditVillage={(village) => {
                  setSelectedVillageForEdit(village);
                  setIsAddEditModalOpen(true);
                }}
                onSaveVillage={handleSaveVillage}
              />
            )}

            {activePage === 'directory' && (
              <Directory
                villages={villages}
                onOpenAddModal={() => {
                  setSelectedVillageForEdit(null);
                  setIsAddEditModalOpen(true);
                }}
                onEditVillage={(village) => {
                  setSelectedVillageForEdit(village);
                  setIsAddEditModalOpen(true);
                }}
                onDeleteVillage={handleDeleteRequest}
                onSaveVillage={handleSaveVillage}
                initialRegion={directoryRegionFilter}
                initialMissingFilter={directoryMissingFilter}
              />
            )}

            {activePage === 'add' && (
              <div className="max-w-2xl mx-auto">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs mb-4">
                  <h2 className="text-xl font-bold text-slate-900">Add New Village Record</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Register a newly recognized settlement or community within the Tangkhul territory.
                  </p>
                </div>
                <AddEditVillageModal
                  isOpen={true}
                  onClose={() => setActivePage('directory')}
                  onSave={async (record) => {
                    await handleSaveVillage(record);
                    setActivePage('directory');
                  }}
                  existingVillage={null}
                  allVillages={villages}
                />
              </div>
            )}

            {activePage === 'import-export' && (
              <ImportExport
                villages={villages}
                onRestoreBackup={handleRestoreBackup}
                onResetDefault={handleResetDefault}
                onBulkImportVillages={handleBulkImportVillages}
              />
            )}

            {activePage === 'settings' && (
              <Settings
                onClearAll={handleClearAll}
                defaultRegion={defaultRegion}
                onSetDefaultRegion={setDefaultRegion}
                defaultViewMode={defaultViewMode}
                onSetDefaultViewMode={setDefaultViewMode}
                villages={villages}
              />
            )}
          </main>
        </div>

        {/* Native Android Bottom Navigation Bar (Mobile) */}
        <AndroidBottomNav
          activePage={activePage}
          onNavigate={handleNavigate}
          villageCount={villages.length}
        />

        {/* Add / Edit Village Modal Drawer */}
        {isAddEditModalOpen && (
          <AddEditVillageModal
            isOpen={isAddEditModalOpen}
            onClose={() => {
              setIsAddEditModalOpen(false);
              setSelectedVillageForEdit(null);
            }}
            onSave={handleSaveVillage}
            existingVillage={selectedVillageForEdit}
            allVillages={villages}
          />
        )}

        {/* Delete Confirmation Dialog */}
        {deleteDialog.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center gap-3 text-rose-700 mb-2">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-base font-bold text-slate-900">Confirm Village Deletion</h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                Are you sure you want to delete the record for{' '}
                <strong className="text-slate-900 font-bold">{deleteDialog.name}</strong> from the local directory? This will remove all associated votes and contact records.
              </p>
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setDeleteDialog({ isOpen: false, id: '', name: '' })}
                  className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-lg bg-rose-700 hover:bg-rose-800 text-xs font-semibold text-white transition shadow-sm"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Offline Toast Indicator */}
        <OfflineIndicator />
      </div>
    </ErrorBoundary>
  );
}
