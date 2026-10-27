/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  FileText,
  Download,
  CheckSquare,
  Square,
  Columns,
  Layers,
  Sparkles,
  Search,
  CheckCircle2,
  Sliders,
  User,
  Phone,
  Vote,
  MapPin,
} from 'lucide-react';
import { RegionKey, VillageRecord } from '../types/village';
import {
  ALL_PDF_COLUMNS,
  PDFColumnKey,
  exportDirectoryToPDF,
  exportSingleVillageToPDF,
} from '../services/pdfExport';
import { markBackupSaved } from '../services/db';

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  villages: VillageRecord[];
  initialSelectedVillage?: VillageRecord | null;
  activeFilterRegion?: RegionKey | 'all';
  filteredVillages?: VillageRecord[];
}

export const ExportPdfModal: React.FC<ExportPdfModalProps> = ({
  isOpen,
  onClose,
  villages,
  initialSelectedVillage = null,
  activeFilterRegion = 'all',
  filteredVillages,
}) => {
  // Mode: 'directory' for table report, 'single' for individual village dossier
  const [activeTab, setActiveTab] = useState<'directory' | 'single'>(
    initialSelectedVillage ? 'single' : 'directory'
  );

  // Directory Export Settings
  const [scope, setScope] = useState<'all' | 'filtered' | 'North' | 'East' | 'West' | 'South'>(
    filteredVillages && filteredVillages.length !== villages.length ? 'filtered' : 'all'
  );
  const [selectedColumns, setSelectedColumns] = useState<PDFColumnKey[]>([
    'slNo',
    'name',
    'region',
    'longphang',
    'votes',
    'president',
    'contactNo',
    'misc',
  ]);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [includeSummaryStats, setIncludeSummaryStats] = useState<boolean>(true);

  // Single Village Export Settings
  const [singleSearchQuery, setSingleSearchQuery] = useState('');
  const [selectedVillageId, setSelectedVillageId] = useState<string>(
    initialSelectedVillage ? initialSelectedVillage.id : villages[0]?.id || ''
  );

  // Status message
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string>('');

  // Determine villages to export for directory mode
  const exportTargetVillages = useMemo(() => {
    if (scope === 'all') return villages;
    if (scope === 'filtered' && filteredVillages) return filteredVillages;
    if (['North', 'East', 'West', 'South'].includes(scope)) {
      return villages.filter((v) => v.region === scope);
    }
    return villages;
  }, [scope, villages, filteredVillages]);

  // Selected village object for single dossier mode
  const selectedVillage = useMemo(() => {
    return (
      villages.find((v) => v.id === selectedVillageId) ||
      initialSelectedVillage ||
      villages[0] ||
      null
    );
  }, [villages, selectedVillageId, initialSelectedVillage]);

  // Filtered list for village dropdown/search
  const filteredSingleVillages = useMemo(() => {
    if (!singleSearchQuery.trim()) return villages.slice(0, 50);
    const q = singleSearchQuery.toLowerCase();
    return villages
      .filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.region.toLowerCase().includes(q) ||
          (v.president && v.president.toLowerCase().includes(q))
      )
      .slice(0, 50);
  }, [villages, singleSearchQuery]);

  if (!isOpen) return null;

  const toggleColumn = (key: PDFColumnKey) => {
    setSelectedColumns((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev; // keep at least 1 column
        return prev.filter((k) => k !== key);
      } else {
        return [...prev, key];
      }
    });
  };

  const selectAllColumns = () => {
    setSelectedColumns(ALL_PDF_COLUMNS.map((c) => c.key));
  };

  const selectMinimalColumns = () => {
    setSelectedColumns(['slNo', 'name', 'region', 'votes']);
  };

  // Trigger Directory PDF Download
  const handleExportDirectory = () => {
    setIsExporting(true);
    setExportNotice('');
    try {
      const regionText =
        scope === 'all'
          ? 'All Regions'
          : scope === 'filtered'
          ? 'Filtered View'
          : `${scope} Region`;

      exportDirectoryToPDF(exportTargetVillages, {
        title: `Tangkhul Village Directory — ${regionText}`,
        subtitle: `Official Administrative Directory & Vote Allocation Record (${exportTargetVillages.length} Villages)`,
        regionFilter: scope === 'all' || scope === 'filtered' ? 'all' : (scope as RegionKey),
        orientation,
        columns: selectedColumns,
        includeSummaryStats,
      });

      markBackupSaved();
      setExportNotice(`Successfully generated PDF for ${exportTargetVillages.length} villages!`);
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setIsExporting(false);
      setExportNotice('Error generating PDF: ' + (err?.message || 'Unknown error'));
    }
  };

  // Trigger Single Village PDF Download
  const handleExportSingleVillage = () => {
    if (!selectedVillage) return;
    setIsExporting(true);
    setExportNotice('');
    try {
      exportSingleVillageToPDF(selectedVillage);
      markBackupSaved();
      setExportNotice(`Downloaded official PDF data sheet for "${selectedVillage.name}"!`);
      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setIsExporting(false);
      setExportNotice('Error generating PDF: ' + (err?.message || 'Unknown error'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-blue-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-800 flex items-center justify-center text-white shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold leading-tight">
                Export Records as Official PDF
              </h3>
              <p className="text-xs text-blue-200 mt-0.5">
                Generate printable, high-resolution PDF documents with complete particulars
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white p-1 rounded-lg transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="bg-slate-100 p-1.5 border-b border-slate-200 flex gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2 ${
              activeTab === 'directory'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Columns className="w-4 h-4 text-blue-700" />
            <span>Complete Directory Report</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-800 font-bold border border-blue-200">
              {exportTargetVillages.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition flex items-center justify-center gap-2 ${
              activeTab === 'single'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-700" />
            <span>Individual Village Dossier</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
              1-Page Data Sheet
            </span>
          </button>
        </div>

        {/* Main Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Notice Feedback */}
          {exportNotice && (
            <div
              className={`p-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 ${
                exportNotice.startsWith('Error')
                  ? 'bg-rose-50 border border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{exportNotice}</span>
            </div>
          )}

          {/* TAB 1: DIRECTORY REPORT */}
          {activeTab === 'directory' && (
            <div className="space-y-4">
              {/* 1. Scope Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5">
                  1. Village Scope & Records to Include
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setScope('all')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      scope === 'all'
                        ? 'border-blue-700 bg-blue-50/60 text-blue-900 ring-1 ring-blue-700'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="block text-xs font-bold">All 233 Villages</span>
                    <span className="block text-[11px] text-slate-500">Full directory archive</span>
                  </button>

                  {filteredVillages && filteredVillages.length !== villages.length && (
                    <button
                      type="button"
                      onClick={() => setScope('filtered')}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        scope === 'filtered'
                          ? 'border-blue-700 bg-blue-50/60 text-blue-900 ring-1 ring-blue-700'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="block text-xs font-bold">Current Filtered View</span>
                      <span className="block text-[11px] text-slate-500">
                        {filteredVillages.length} matched villages
                      </span>
                    </button>
                  )}

                  {(['North', 'East', 'West', 'South'] as RegionKey[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setScope(r)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        scope === r
                          ? 'border-blue-700 bg-blue-50/60 text-blue-900 ring-1 ring-blue-700'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="block text-xs font-bold">{r} Region</span>
                      <span className="block text-[11px] text-slate-500">
                        {villages.filter((v) => v.region === r).length} villages
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Choose Particular Data Columns */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    2. Select Particular Data Columns to Include
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={selectAllColumns}
                      className="text-blue-700 hover:underline font-semibold"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={selectMinimalColumns}
                      className="text-slate-500 hover:underline"
                    >
                      Essential Only
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {ALL_PDF_COLUMNS.map((col) => {
                    const isChecked = selectedColumns.includes(col.key);
                    return (
                      <button
                        key={col.key}
                        type="button"
                        onClick={() => toggleColumn(col.key)}
                        className={`flex items-center gap-2 p-2 rounded-lg text-left transition text-xs font-medium ${
                          isChecked
                            ? 'bg-white text-blue-900 border border-blue-200 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-blue-700 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate">{col.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Document Layout & Summary Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5">
                    3. Page Orientation
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrientation('landscape')}
                      className={`p-2.5 rounded-xl border text-center text-xs font-semibold transition ${
                        orientation === 'landscape'
                          ? 'border-blue-700 bg-blue-50 text-blue-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Landscape (Wide)
                      <span className="block text-[10px] text-slate-500 font-normal mt-0.5">
                        Best for all columns
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrientation('portrait')}
                      className={`p-2.5 rounded-xl border text-center text-xs font-semibold transition ${
                        orientation === 'portrait'
                          ? 'border-blue-700 bg-blue-50 text-blue-900'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Portrait (Tall)
                      <span className="block text-[10px] text-slate-500 font-normal mt-0.5">
                        Compact tables
                      </span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5">
                    4. Header Statistics Banner
                  </label>
                  <button
                    type="button"
                    onClick={() => setIncludeSummaryStats(!includeSummaryStats)}
                    className={`w-full p-2.5 rounded-xl border text-left text-xs font-medium transition flex items-center justify-between ${
                      includeSummaryStats
                        ? 'border-emerald-700 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="block font-bold">
                        {includeSummaryStats ? 'Included on Page 1' : 'Omitted'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Shows total votes and regional distribution
                      </span>
                    </div>
                    {includeSummaryStats ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SINGLE VILLAGE DOSSIER */}
          {activeTab === 'single' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5">
                  Select Village to Generate Official 1-Page PDF Profile
                </label>
                <div className="relative mb-2">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search village name or region..."
                    value={singleSearchQuery}
                    onChange={(e) => setSingleSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                  {filteredSingleVillages.map((v) => {
                    const isSelected = selectedVillage?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVillageId(v.id)}
                        className={`w-full text-left p-2.5 text-xs flex items-center justify-between transition ${
                          isSelected ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 text-slate-400 font-mono text-[11px]">#{v.slNo}</span>
                          <span>{v.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {v.region}
                          </span>
                        </div>
                        <span className="text-slate-500">
                          {v.votes !== null ? `${v.votes} votes` : 'Unrecorded'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview of Particulars that will be exported */}
              {selectedVillage && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                        PDF Dossier Preview
                      </span>
                      <h4 className="text-base font-bold text-slate-900 mt-0.5">
                        {selectedVillage.name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        Sl. No. {selectedVillage.slNo} • {selectedVillage.region} Region ({selectedVillage.longphang} Council)
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block">Registered Strength</span>
                      <span className="text-sm font-bold text-blue-900 block">
                        {selectedVillage.votes !== null ? `${selectedVillage.votes} Votes` : 'Unrecorded'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="block text-[10px] text-slate-400">President / Headman</span>
                        <span className="font-semibold text-slate-800">
                          {selectedVillage.president || 'Not recorded'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <span className="block text-[10px] text-slate-400">Contact Number</span>
                        <span className="font-semibold text-slate-800">
                          {selectedVillage.contactNo || 'Not registered'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedVillage.misc && (
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 text-xs">
                      <span className="block text-[10px] text-slate-400 mb-0.5">Remarks / Particular Notes</span>
                      <p className="text-slate-700 italic">{selectedVillage.misc}</p>
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Includes official archival seal stamp, verification borders, and signature spaces.</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-5 py-4 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            {activeTab === 'directory'
              ? `${exportTargetVillages.length} villages • ${selectedColumns.length} particulars selected`
              : selectedVillage
              ? `Ready to generate dossier for ${selectedVillage.name}`
              : 'Select a village'}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </button>

            {activeTab === 'directory' ? (
              <button
                type="button"
                onClick={handleExportDirectory}
                disabled={isExporting || exportTargetVillages.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-xs font-semibold text-white transition shadow-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isExporting ? 'Generating PDF...' : `Download PDF (${exportTargetVillages.length} Villages)`}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExportSingleVillage}
                disabled={isExporting || !selectedVillage}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-xs font-semibold text-white transition shadow-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isExporting ? 'Generating Dossier...' : `Download ${selectedVillage?.name || 'Village'} PDF`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
