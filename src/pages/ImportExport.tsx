/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileJson,
  FileText,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { BackupPayload, RegionKey, VillageRecord } from '../types/village';
import { markBackupSaved } from '../services/db';
import { ExportPdfModal } from '../components/ExportPdfModal';
import { exportDirectoryToPDF } from '../services/pdfExport';

interface ImportExportProps {
  villages: VillageRecord[];
  onRestoreBackup: (records: VillageRecord[], mode: 'replace' | 'merge') => Promise<void>;
  onResetDefault: () => Promise<void>;
  onBulkImportVillages: (records: VillageRecord[], mode: 'skip' | 'update') => Promise<{ added: number; updated: number; skipped: number }>;
}

export const ImportExport: React.FC<ImportExportProps> = ({
  villages,
  onRestoreBackup,
  onResetDefault,
  onBulkImportVillages,
}) => {
  // Status feedback states
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvParsedRecords, setCsvParsedRecords] = useState<VillageRecord[]>([]);
  const [csvDuplicateCount, setCsvDuplicateCount] = useState<number>(0);
  const [csvConflictMode, setCsvConflictMode] = useState<'skip' | 'update'>('skip');
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);

  // JSON Restore State
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [jsonBackupPayload, setJsonBackupPayload] = useState<BackupPayload | null>(null);
  const [jsonRestoreMode, setJsonRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [isProcessingJson, setIsProcessingJson] = useState(false);

  // PDF Export Modal State
  const [isExportPdfOpen, setIsExportPdfOpen] = useState(false);

  // Reset to default confirmation state
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Clear messages after 6s
  const notifySuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage('');
    setTimeout(() => setSuccessMessage(''), 6000);
  };

  const notifyError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage('');
  };

  // 1. Export CSV
  const handleExportCSV = () => {
    try {
      const headers = [
        'Sl. No.',
        'Name of Village',
        'Region',
        'Longphang',
        'No. of Votes',
        'President',
        'Contact No.',
        'Misc.',
        'Record ID',
        'Last Updated',
      ];

      const rows = villages.map((v) => [
        v.slNo,
        `"${(v.name || '').replace(/"/g, '""')}"`,
        `"${v.region}"`,
        `"${v.longphang}"`,
        v.votes !== null && v.votes !== undefined ? v.votes : '',
        `"${(v.president || '').replace(/"/g, '""')}"`,
        `"${(v.contactNo || '').replace(/"/g, '""')}"`,
        `"${(v.misc || '').replace(/"/g, '""')}"`,
        `"${v.id}"`,
        `"${v.updatedAt}"`,
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tangkhul-village-directory-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      markBackupSaved();
      notifySuccess(`Exported ${villages.length} villages to CSV successfully.`);
    } catch (err: any) {
      notifyError(err?.message || 'Failed to export CSV.');
    }
  };

  // 2. Export JSON Backup
  const handleExportJSON = () => {
    try {
      const payload: BackupPayload = {
        version: 1,
        appName: 'Tangkhul Village Directory',
        exportedAt: new Date().toISOString(),
        totalRecords: villages.length,
        records: villages,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
      const downloadAnchor = document.createElement('a');
      const filename = `tangkhul-directory-backup-${new Date().toISOString().slice(0, 10)}.json`;
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      markBackupSaved();
      notifySuccess(`Exported JSON backup with ${villages.length} records.`);
    } catch (err: any) {
      notifyError(err?.message || 'Failed to export JSON backup.');
    }
  };

  // 3. Handle CSV File Selection & Parse
  const handleCsvSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          notifyError('CSV file appears empty or missing data rows.');
          return;
        }

        const headerLine = lines[0];
        const headers = headerLine.split(',').map((h) => h.replace(/^["'\s]+|["'\s]+$/g, '').toLowerCase());

        const nameIdx = headers.findIndex((h) => h.includes('village') || h.includes('name'));
        const regionIdx = headers.findIndex((h) => h.includes('region'));
        const longphangIdx = headers.findIndex((h) => h.includes('longphang'));
        const votesIdx = headers.findIndex((h) => h.includes('vote'));
        const presidentIdx = headers.findIndex((h) => h.includes('president'));
        const contactIdx = headers.findIndex((h) => h.includes('contact') || h.includes('phone'));
        const miscIdx = headers.findIndex((h) => h.includes('misc') || h.includes('note') || h.includes('remark'));
        const slIdx = headers.findIndex((h) => h.includes('sl') || h.includes('no'));

        if (nameIdx === -1) {
          notifyError('Could not find "Village Name" or "Name" column in CSV header.');
          return;
        }

        const parsedList: VillageRecord[] = [];
        let dupCount = 0;
        const existingNames = new Set(villages.map((v) => v.name.trim().toLowerCase()));

        for (let i = 1; i < lines.length; i++) {
          const rowText = lines[i];
          // Basic CSV quote-safe parser
          const regex = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
          const cols: string[] = [];
          let match;
          while ((match = regex.exec(rowText)) !== null) {
            let val = match[1] || '';
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.substring(1, val.length - 1).replace(/""/g, '"');
            }
            cols.push(val.trim());
            if (match.index === regex.lastIndex) regex.lastIndex++;
          }

          const villageName = cols[nameIdx] || '';
          if (!villageName) continue;

          let regVal: RegionKey = 'North';
          const rStr = (cols[regionIdx] || '').toLowerCase();
          if (rStr.includes('east') || rStr.includes('zingsho')) regVal = 'East';
          else if (rStr.includes('west') || rStr.includes('zingtun')) regVal = 'West';
          else if (rStr.includes('south') || rStr.includes('aze')) regVal = 'South';

          let longphangVal = cols[longphangIdx] || (regVal === 'North' ? 'Ato' : regVal === 'East' ? 'Zingsho' : regVal === 'West' ? 'Zingtun' : 'Aze');
          
          let votesVal: number | null = null;
          if (votesIdx !== -1 && cols[votesIdx] !== undefined && cols[votesIdx].trim() !== '') {
            const vNum = parseInt(cols[votesIdx].trim(), 10);
            if (!isNaN(vNum)) votesVal = vNum;
          }

          const pres = presidentIdx !== -1 ? cols[presidentIdx] || '' : '';
          const contact = contactIdx !== -1 ? cols[contactIdx] || '' : '';
          const misc = miscIdx !== -1 ? cols[miscIdx] || '' : '';
          const sl = slIdx !== -1 ? parseInt(cols[slIdx] || '0', 10) || i : i;

          if (existingNames.has(villageName.toLowerCase())) {
            dupCount++;
          }

          parsedList.push({
            id: `v-imp-${Date.now()}-${i}`,
            slNo: sl,
            name: villageName,
            region: regVal,
            longphang: longphangVal,
            votes: votesVal,
            president: pres,
            contactNo: contact,
            misc,
            updatedAt: new Date().toISOString(),
          });
        }

        setCsvParsedRecords(parsedList);
        setCsvDuplicateCount(dupCount);
      } catch (err: any) {
        notifyError('Failed to parse CSV file: ' + err?.message);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmCsvImport = async () => {
    if (csvParsedRecords.length === 0) return;
    setIsProcessingCsv(true);
    try {
      const res = await onBulkImportVillages(csvParsedRecords, csvConflictMode);
      notifySuccess(
        `Import completed: ${res.added} added, ${res.updated} updated, ${res.skipped} skipped.`
      );
      setCsvFile(null);
      setCsvParsedRecords([]);
      setCsvDuplicateCount(0);
    } catch (err: any) {
      notifyError(err?.message || 'Error importing CSV records');
    } finally {
      setIsProcessingCsv(false);
    }
  };

  // 4. Handle JSON Restore Selection
  const handleJsonSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setJsonFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const parsed = JSON.parse(text) as BackupPayload;
        if (!parsed.records || !Array.isArray(parsed.records)) {
          notifyError('Invalid backup file: missing records array.');
          return;
        }
        setJsonBackupPayload(parsed);
      } catch (err: any) {
        notifyError('Failed to read JSON backup file: ' + err?.message);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmJsonRestore = async () => {
    if (!jsonBackupPayload || !jsonBackupPayload.records) return;
    setIsProcessingJson(true);
    try {
      await onRestoreBackup(jsonBackupPayload.records, jsonRestoreMode);
      notifySuccess(
        `Restored backup successfully with ${jsonBackupPayload.records.length} records (${jsonRestoreMode} mode).`
      );
      setJsonFile(null);
      setJsonBackupPayload(null);
    } catch (err: any) {
      notifyError(err?.message || 'Error restoring backup');
    } finally {
      setIsProcessingJson(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Data Import, Export & Offline Backup
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Keep offline backups of your Tangkhul village records or import external spreadsheets without data loss.
        </p>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800 flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-800 flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Export Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* PDF Export Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center mb-3">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <h3 className="text-base font-bold text-slate-900">
                Official PDF Document
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                PDF
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Export all <strong>{villages.length} records</strong> as an official archival PDF document, or generate 1-page individual village dossiers with official authentication stamps and all particulars.
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Printable & Archival</span>
            <button
              onClick={() => setIsExportPdfOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-xs font-semibold text-white transition shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* CSV Export Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Export to Spreadsheet (CSV)
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Export all <strong>{villages.length} records</strong> into an Excel-ready CSV format. Includes UTF-8 encoding for village names and longphang designations.
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Excel / Google Sheets</span>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-xs font-semibold text-white transition shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV</span>
            </button>
          </div>
        </div>

        {/* JSON Backup Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
              <FileJson className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Complete JSON Backup
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Creates a full database snapshot containing record IDs, timestamps, vote allocations, and contact data. Recommended before making bulk edits.
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Full Structured Backup</span>
            <button
              onClick={handleExportJSON}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-xs font-semibold text-white transition shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download JSON Backup</span>
            </button>
          </div>
        </div>
      </div>

      {/* CSV Import Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center gap-2.5 mb-2">
          <Upload className="w-5 h-5 text-blue-700" />
          <h3 className="text-base font-bold text-slate-900">Import Records from CSV</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Upload a CSV file containing village records. The file should have columns for Village Name, Region (North/East/West/South), Votes, President, and Contact Number.
        </p>

        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-400 transition bg-slate-50/50">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvSelect}
            className="hidden"
            id="csv-file-input"
          />
          <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center">
            <FileSpreadsheet className="w-8 h-8 text-blue-600 mb-2" />
            <span className="text-xs sm:text-sm font-semibold text-blue-700 hover:underline">
              {csvFile ? csvFile.name : 'Select or browse a CSV file'}
            </span>
            <span className="text-[11px] text-slate-400 mt-1">
              Supports comma-delimited (.csv) files up to 10MB
            </span>
          </label>
        </div>

        {/* CSV Preview and Conflict Resolution */}
        {csvParsedRecords.length > 0 && (
          <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  CSV Preview Summary
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Found <strong>{csvParsedRecords.length}</strong> valid rows.
                  {csvDuplicateCount > 0 && (
                    <span className="text-amber-700 font-semibold ml-1">
                      ({csvDuplicateCount} villages already exist in the database)
                    </span>
                  )}
                </p>
              </div>

              {/* Conflict handling option */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600">On duplicate names:</label>
                <select
                  value={csvConflictMode}
                  onChange={(e) => setCsvConflictMode(e.target.value as any)}
                  className="text-xs bg-white border border-slate-300 rounded-md py-1 px-2 text-slate-800"
                >
                  <option value="skip">Skip duplicates</option>
                  <option value="update">Update existing records</option>
                </select>
              </div>
            </div>

            {/* Small preview table */}
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 text-[11px] sticky top-0">
                  <tr>
                    <th className="p-2">Village</th>
                    <th className="p-2">Region</th>
                    <th className="p-2 text-center">Votes</th>
                    <th className="p-2">President</th>
                    <th className="p-2">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {csvParsedRecords.slice(0, 5).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2 font-medium text-slate-900">{row.name}</td>
                      <td className="p-2 text-slate-600">{row.region}</td>
                      <td className="p-2 text-center">{row.votes ?? '—'}</td>
                      <td className="p-2 text-slate-600">{row.president || '—'}</td>
                      <td className="p-2 text-slate-600">{row.contactNo || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setCsvFile(null);
                  setCsvParsedRecords([]);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCsvImport}
                disabled={isProcessingCsv}
                className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-xs font-semibold text-white transition disabled:opacity-50"
              >
                {isProcessingCsv ? 'Importing...' : `Confirm Import of ${csvParsedRecords.length} Records`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* JSON Restore Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center gap-2.5 mb-2">
          <FileJson className="w-5 h-5 text-blue-700" />
          <h3 className="text-base font-bold text-slate-900">Restore from JSON Backup</h3>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Restore from a previous backup file created by this app. You can either merge backup data with current records or completely replace the directory.
        </p>

        <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-400 transition bg-slate-50/50">
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleJsonSelect}
            className="hidden"
            id="json-file-input"
          />
          <label htmlFor="json-file-input" className="cursor-pointer flex flex-col items-center">
            <Upload className="w-8 h-8 text-blue-600 mb-2" />
            <span className="text-xs sm:text-sm font-semibold text-blue-700 hover:underline">
              {jsonFile ? jsonFile.name : 'Select a JSON backup file (.json)'}
            </span>
          </label>
        </div>

        {jsonBackupPayload && (
          <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Backup File Details
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Backup contains <strong>{jsonBackupPayload.records.length} records</strong> created on{' '}
                  {new Date(jsonBackupPayload.exportedAt).toLocaleString()}.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600">Restore Mode:</label>
                <select
                  value={jsonRestoreMode}
                  onChange={(e) => setJsonRestoreMode(e.target.value as any)}
                  className="text-xs bg-white border border-slate-300 rounded-md py-1 px-2 text-slate-800"
                >
                  <option value="merge">Merge & Update (Safe)</option>
                  <option value="replace">Complete Replacement</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => {
                  setJsonFile(null);
                  setJsonBackupPayload(null);
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmJsonRestore}
                disabled={isProcessingJson}
                className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-xs font-semibold text-white transition disabled:opacity-50"
              >
                {isProcessingJson ? 'Restoring...' : `Restore ${jsonBackupPayload.records.length} Records`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Re-seed to Original 233 Villages */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <RotateCcw className="w-4 h-4 text-slate-600" />
              <span>Reset to Official 233 Village Directory</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Restores the exact initial dataset of all 233 villages across North (Ato), East (Zingsho), West (Zingtun), and South (Aze) as transcribed from the official source directory document.
            </p>
          </div>

          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shrink-0"
          >
            Reset to Official Data
          </button>
        </div>

        {showResetConfirm && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
            <div className="flex items-start gap-2.5 text-xs text-amber-900">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Are you sure you want to reset the directory?</p>
                <p className="mt-0.5 text-amber-800">
                  This will reload the initial 233 records and overwrite any un-exported edits you made. Make sure you downloaded a JSON backup first if needed.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowResetConfirm(false);
                  await onResetDefault();
                  notifySuccess('Database reset to official 233 Tangkhul village records.');
                }}
                className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold transition"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PDF Export Modal */}
      {isExportPdfOpen && (
        <ExportPdfModal
          isOpen={isExportPdfOpen}
          onClose={() => setIsExportPdfOpen(false)}
          villages={villages}
        />
      )}
    </div>
  );
};
