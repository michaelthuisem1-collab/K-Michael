/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Table as TableIcon,
  LayoutGrid,
  Download,
  X,
  Phone,
  User,
  Vote,
  FileText,
  AlertCircle,
  RotateCcw,
  Check,
  MousePointerClick,
} from 'lucide-react';
import {
  MissingInfoFilter,
  RegionKey,
  SortField,
  SortOrder,
  ViewMode,
  VillageRecord,
} from '../types/village';
import { ExportPdfModal } from '../components/ExportPdfModal';
import { exportSingleVillageToPDF } from '../services/pdfExport';

interface DirectoryProps {
  villages: VillageRecord[];
  onOpenAddModal: () => void;
  onEditVillage?: (village: VillageRecord) => void;
  onDeleteVillage: (id: string, name: string) => void;
  onSaveVillage: (record: VillageRecord) => Promise<void>;
  initialRegion?: RegionKey | 'all';
  initialMissingFilter?: MissingInfoFilter;
}

const DEFAULT_LONGPHANGS: Record<RegionKey, string> = {
  North: 'Ato',
  East: 'Zingsho',
  West: 'Zingtun',
  South: 'Aze',
};

export const Directory: React.FC<DirectoryProps> = ({
  villages,
  onOpenAddModal,
  onDeleteVillage,
  onSaveVillage,
  initialRegion = 'all',
  initialMissingFilter = 'all',
}) => {
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<RegionKey | 'all'>(initialRegion);
  const [missingFilter, setMissingFilter] = useState<MissingInfoFilter>(initialMissingFilter);
  const [sortBy, setSortBy] = useState<SortField>('slNo');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Selected village for view detail drawer
  const [activeVillage, setActiveVillage] = useState<VillageRecord | null>(null);

  // PDF Export Modal State
  const [isExportPdfOpen, setIsExportPdfOpen] = useState(false);
  const [targetVillageForPdf, setTargetVillageForPdf] = useState<VillageRecord | null>(null);

  // ==========================================
  // DIRECT INLINE EDITING STATE (NO MODAL/PAGE)
  // ==========================================
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    id: string;
    slNo: number;
    name: string;
    region: RegionKey;
    longphang: string;
    votes: string;
    president: string;
    contactNo: string;
    misc: string;
  }>({
    id: '',
    slNo: 1,
    name: '',
    region: 'North',
    longphang: 'Ato',
    votes: '',
    president: '',
    contactNo: '',
    misc: '',
  });

  // Inline "New Village" row state
  const [isAddingInline, setIsAddingInline] = useState(false);
  const [newVillageForm, setNewVillageForm] = useState<{
    name: string;
    region: RegionKey;
    longphang: string;
    votes: string;
    president: string;
    contactNo: string;
    misc: string;
  }>({
    name: '',
    region: 'North',
    longphang: 'Ato',
    votes: '',
    president: '',
    contactNo: '',
    misc: '',
  });

  const [inlineError, setInlineError] = useState<string>('');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string>('');

  const nameInputRef = useRef<HTMLInputElement>(null);
  const newNameInputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [editingId]);

  useEffect(() => {
    if (isAddingInline && newNameInputRef.current) {
      newNameInputRef.current.focus();
    }
  }, [isAddingInline]);

  // Synchronize when parent navigation changes initialRegion or initialMissingFilter
  useEffect(() => {
    setSelectedRegion(initialRegion);
    setCurrentPage(1);
  }, [initialRegion]);

  useEffect(() => {
    setMissingFilter(initialMissingFilter);
    setCurrentPage(1);
  }, [initialMissingFilter]);

  // Start inline editing
  const startInlineEdit = (village: VillageRecord) => {
    setEditingId(village.id);
    setIsAddingInline(false);
    setInlineError('');
    setEditForm({
      id: village.id,
      slNo: village.slNo,
      name: village.name,
      region: village.region,
      longphang: village.longphang || DEFAULT_LONGPHANGS[village.region],
      votes: village.votes !== null && village.votes !== undefined ? String(village.votes) : '',
      president: village.president || '',
      contactNo: village.contactNo || '',
      misc: village.misc || '',
    });
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    setInlineError('');
  };

  // Save inline edit
  const handleSaveInline = async () => {
    if (!editForm.name.trim()) {
      setInlineError('Village name cannot be empty');
      return;
    }

    let voteCount: number | null = null;
    if (editForm.votes.trim() !== '') {
      const parsed = parseInt(editForm.votes.trim(), 10);
      if (isNaN(parsed) || parsed < 0) {
        setInlineError('Vote count must be a non-negative number or blank');
        return;
      }
      voteCount = parsed;
    }

    const updatedRecord: VillageRecord = {
      id: editForm.id,
      slNo: editForm.slNo,
      name: editForm.name.trim(),
      region: editForm.region,
      longphang: editForm.longphang.trim() || DEFAULT_LONGPHANGS[editForm.region],
      votes: voteCount,
      president: editForm.president.trim(),
      contactNo: editForm.contactNo.trim(),
      misc: editForm.misc.trim(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSaveVillage(updatedRecord);
      setEditingId(null);
      setInlineError('');
      setSaveSuccessNotice(`Saved "${updatedRecord.name}"`);
      setTimeout(() => setSaveSuccessNotice(''), 3000);
    } catch (err: any) {
      setInlineError(err?.message || 'Failed to save');
    }
  };

  // Save new inline record
  const handleSaveNewInline = async () => {
    if (!newVillageForm.name.trim()) {
      setInlineError('Village name is required');
      return;
    }

    let voteCount: number | null = null;
    if (newVillageForm.votes.trim() !== '') {
      const parsed = parseInt(newVillageForm.votes.trim(), 10);
      if (isNaN(parsed) || parsed < 0) {
        setInlineError('Vote count must be a non-negative number or blank');
        return;
      }
      voteCount = parsed;
    }

    const nextSl =
      villages
        .filter((v) => v.region === newVillageForm.region)
        .reduce((max, v) => Math.max(max, v.slNo || 0), 0) + 1;

    const newRecord: VillageRecord = {
      id: `v-${newVillageForm.region.toLowerCase()}-${Date.now()}`,
      slNo: nextSl,
      name: newVillageForm.name.trim(),
      region: newVillageForm.region,
      longphang: newVillageForm.longphang.trim() || DEFAULT_LONGPHANGS[newVillageForm.region],
      votes: voteCount,
      president: newVillageForm.president.trim(),
      contactNo: newVillageForm.contactNo.trim(),
      misc: newVillageForm.misc.trim(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSaveVillage(newRecord);
      setIsAddingInline(false);
      setNewVillageForm({
        name: '',
        region: 'North',
        longphang: 'Ato',
        votes: '',
        president: '',
        contactNo: '',
        misc: '',
      });
      setInlineError('');
      setSaveSuccessNotice(`Added "${newRecord.name}"`);
      setTimeout(() => setSaveSuccessNotice(''), 3000);
    } catch (err: any) {
      setInlineError(err?.message || 'Failed to add record');
    }
  };

  // Keyboard navigation inside inline inputs
  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveInline();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelInlineEdit();
    }
  };

  const handleNewInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveNewInline();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsAddingInline(false);
    }
  };

  // Filtered & sorted records
  const filteredVillages = useMemo(() => {
    let result = [...villages];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.region.toLowerCase().includes(q) ||
          v.longphang.toLowerCase().includes(q) ||
          (v.president && v.president.toLowerCase().includes(q)) ||
          (v.contactNo && v.contactNo.includes(q)) ||
          (v.misc && v.misc.toLowerCase().includes(q))
      );
    }

    // Region filter
    if (selectedRegion !== 'all') {
      result = result.filter((v) => v.region === selectedRegion);
    }

    // Missing information filter
    if (missingFilter === 'missing-votes') {
      result = result.filter((v) => v.votes === null || v.votes === undefined);
    } else if (missingFilter === 'missing-president') {
      result = result.filter((v) => !v.president || v.president.trim() === '');
    } else if (missingFilter === 'missing-contact') {
      result = result.filter((v) => !v.contactNo || v.contactNo.trim() === '');
    } else if (missingFilter === 'any-missing') {
      result = result.filter(
        (v) =>
          v.votes === null ||
          v.votes === undefined ||
          !v.president ||
          v.president.trim() === '' ||
          !v.contactNo ||
          v.contactNo.trim() === ''
      );
    } else if (missingFilter === 'complete') {
      result = result.filter(
        (v) =>
          v.votes !== null &&
          v.votes !== undefined &&
          v.president &&
          v.president.trim() !== '' &&
          v.contactNo &&
          v.contactNo.trim() !== ''
      );
    }

    // Sorting
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === 'region') {
        cmp = a.region.localeCompare(b.region) || a.slNo - b.slNo;
      } else if (sortBy === 'votes') {
        const aVotes = a.votes !== null ? a.votes : -1;
        const bVotes = b.votes !== null ? b.votes : -1;
        cmp = aVotes - bVotes;
      } else if (sortBy === 'updatedAt') {
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      } else {
        // default: slNo within region or overall
        if (a.region === b.region) {
          cmp = a.slNo - b.slNo;
        } else {
          cmp = a.region.localeCompare(b.region);
        }
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [villages, searchQuery, selectedRegion, missingFilter, sortBy, sortOrder]);

  // Pagination calculation
  const totalItems = filteredVillages.length;
  const totalPages = pageSize === -1 ? 1 : Math.ceil(totalItems / pageSize);
  const paginatedVillages = useMemo(() => {
    if (pageSize === -1) return filteredVillages;
    const start = (currentPage - 1) * pageSize;
    return filteredVillages.slice(start, start + pageSize);
  }, [filteredVillages, currentPage, pageSize]);

  // Reset to page 1 on filter changes
  const handleRegionChange = (reg: RegionKey | 'all') => {
    setSelectedRegion(reg);
    setCurrentPage(1);
  };

  const handleMissingFilterChange = (filter: MissingInfoFilter) => {
    setMissingFilter(filter);
    setCurrentPage(1);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedRegion('all');
    setMissingFilter('all');
    setSortBy('slNo');
    setSortOrder('asc');
    setCurrentPage(1);
  };

  // Export current filtered list to CSV
  const handleExportFilteredCSV = () => {
    const headers = [
      'Sl. No.',
      'Name of Village',
      'Region',
      'Longphang',
      'No. of Votes',
      'President',
      'Contact No.',
      'Misc.',
      'Last Updated',
    ];

    const rows = filteredVillages.map((v, index) => [
      v.slNo || index + 1,
      `"${(v.name || '').replace(/"/g, '""')}"`,
      `"${v.region}"`,
      `"${v.longphang}"`,
      v.votes !== null && v.votes !== undefined ? v.votes : '',
      `"${(v.president || '').replace(/"/g, '""')}"`,
      `"${(v.contactNo || '').replace(/"/g, '""')}"`,
      `"${(v.misc || '').replace(/"/g, '""')}"`,
      `"${v.updatedAt}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tangkhul-villages-${selectedRegion}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Page Title & Quick Actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Village Directory
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200">
              <MousePointerClick className="w-3 h-3 text-blue-600" />
              Double-click any row to edit
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Directly edit names, votes, presidents, and contacts inline without opening a new page.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTargetVillageForPdf(null);
              setIsExportPdfOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-xs font-semibold text-red-800 hover:bg-red-100 transition shadow-xs"
            title="Export full directory or individual village particulars as official PDF"
          >
            <FileText className="w-3.5 h-3.5 text-red-700" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={handleExportFilteredCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
            title="Export currently filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={() => {
              setIsAddingInline(true);
              setEditingId(null);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-xs sm:text-sm font-semibold text-white transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Row Inline</span>
          </button>
        </div>
      </div>

      {/* Floating Success / Error feedback */}
      {saveSuccessNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccessNotice} successfully saved!</span>
        </div>
      )}

      {inlineError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{inlineError}</span>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        {/* Row 1: Search Box + View Switcher */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by village name, president, contact, or notes..."
              className="w-full pl-10 pr-9 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* View mode toggle (Table vs Card) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
                viewMode === 'table'
                  ? 'bg-white text-blue-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table view"
            >
              <TableIcon className="w-4 h-4" />
              <span className="hidden md:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${
                viewMode === 'cards'
                  ? 'bg-white text-blue-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Grid Cards view"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden md:inline">Cards</span>
            </button>
          </div>
        </div>

        {/* Row 2: Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100">
          {/* Region Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Region / Longphang
            </label>
            <select
              value={selectedRegion}
              onChange={(e) => handleRegionChange(e.target.value as any)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
            >
              <option value="all">All Regions (All 4)</option>
              <option value="North">North — Ato (47)</option>
              <option value="East">East — Zingsho (65)</option>
              <option value="West">West — Zingtun (34)</option>
              <option value="South">South — Aze (87)</option>
            </select>
          </div>

          {/* Missing Info Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Status / Completeness
            </label>
            <select
              value={missingFilter}
              onChange={(e) => handleMissingFilterChange(e.target.value as any)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
            >
              <option value="all">All Records</option>
              <option value="any-missing">Any Missing Information</option>
              <option value="missing-votes">Missing Vote Counts</option>
              <option value="missing-president">Missing President</option>
              <option value="missing-contact">Missing Contact No.</option>
              <option value="complete">Fully Populated</option>
            </select>
          </div>

          {/* Sort By Field */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Sort By
            </label>
            <div className="flex gap-1.5">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2.5 text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value="slNo">Serial Number (Sl. No.)</option>
                <option value="name">Village Name</option>
                <option value="region">Region / Longphang</option>
                <option value="votes">Vote Count</option>
                <option value="updatedAt">Recently Updated</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 transition"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Reset Filters / Active indicator */}
          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full py-1.5 px-3 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          </div>
        </div>
      </div>

      {/* Records Count & Pagination Info Header */}
      <div className="flex items-center justify-between text-xs text-slate-600 px-1">
        <div className="flex items-center gap-2">
          <span>
            Showing <strong>{filteredVillages.length}</strong> of <strong>{villages.length}</strong> villages
            {selectedRegion !== 'all' && <span> in {selectedRegion}</span>}
            {searchQuery && <span> matching "{searchQuery}"</span>}
          </span>
          <span className="hidden md:inline text-slate-400">|</span>
          <span className="hidden md:inline text-blue-700 font-medium">
            Double-click row to edit • Enter to save • Esc to cancel
          </span>
        </div>

        {/* Page size picker */}
        <div className="flex items-center gap-2">
          <label htmlFor="pageSizeSelect" className="text-slate-500 hidden sm:inline">Per page:</label>
          <select
            id="pageSizeSelect"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-xs bg-white border border-slate-300 rounded-md py-1 px-2 text-slate-700"
          >
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={-1}>All ({filteredVillages.length})</option>
          </select>
        </div>
      </div>

      {/* No Results Fallback */}
      {filteredVillages.length === 0 && !isAddingInline && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No villages matched your search</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Try adjusting your search terms, clearing region filters, or resetting filters.
          </p>
          <button
            onClick={resetFilters}
            className="mt-4 px-4 py-2 bg-blue-700 text-white text-xs font-semibold rounded-lg hover:bg-blue-800 transition"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (filteredVillages.length > 0 || isAddingInline) && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/90 text-slate-700 uppercase text-[11px] font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3.5 w-14 text-center">Sl.</th>
                  <th className="py-3 px-4 min-w-[140px]">Name of Village</th>
                  <th className="py-3 px-3.5 min-w-[110px]">Region</th>
                  <th className="py-3 px-3.5 min-w-[100px]">Longphang</th>
                  <th className="py-3 px-3.5 text-center min-w-[90px]">Votes</th>
                  <th className="py-3 px-4 min-w-[130px]">President</th>
                  <th className="py-3 px-4 min-w-[120px]">Contact No.</th>
                  <th className="py-3 px-4 min-w-[150px]">Misc.</th>
                  <th className="py-3 px-4 text-right min-w-[110px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* INLINE NEW ROW (IF ACTIVE) */}
                {isAddingInline && (
                  <tr className="bg-blue-50/90 border-b-2 border-blue-400">
                    <td className="py-2.5 px-3 text-center font-bold text-blue-700">New</td>
                    <td className="py-2.5 px-2">
                      <input
                        ref={newNameInputRef}
                        type="text"
                        placeholder="Village name *"
                        value={newVillageForm.name}
                        onChange={(e) => setNewVillageForm({ ...newVillageForm, name: e.target.value })}
                        onKeyDown={handleNewInlineKeyDown}
                        className="w-full px-2 py-1 text-xs bg-white border border-blue-400 rounded focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-semibold"
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <select
                        value={newVillageForm.region}
                        onChange={(e) => {
                          const r = e.target.value as RegionKey;
                          setNewVillageForm({
                            ...newVillageForm,
                            region: r,
                            longphang: DEFAULT_LONGPHANGS[r],
                          });
                        }}
                        className="w-full px-2 py-1 text-xs bg-white border border-blue-400 rounded focus:outline-hidden"
                      >
                        <option value="North">North</option>
                        <option value="East">East</option>
                        <option value="West">West</option>
                        <option value="South">South</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="text"
                        placeholder="Longphang"
                        value={newVillageForm.longphang}
                        onChange={(e) => setNewVillageForm({ ...newVillageForm, longphang: e.target.value })}
                        onKeyDown={handleNewInlineKeyDown}
                        className="w-full px-2 py-1 text-xs bg-white border border-blue-400 rounded focus:outline-hidden"
                      />
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <input
                        type="number"
                        min="0"
                        placeholder="Votes"
                        value={newVillageForm.votes}
                        onChange={(e) => setNewVillageForm({ ...newVillageForm, votes: e.target.value })}
                        onKeyDown={handleNewInlineKeyDown}
                        className="w-16 px-1.5 py-1 text-xs text-center bg-white border border-blue-400 rounded focus:outline-hidden"
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="text"
                        placeholder="President"
                        value={newVillageForm.president}
                        onChange={(e) => setNewVillageForm({ ...newVillageForm, president: e.target.value })}
                        onKeyDown={handleNewInlineKeyDown}
                        className="w-full px-2 py-1 text-xs bg-white border border-blue-400 rounded focus:outline-hidden"
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="tel"
                        placeholder="Contact No."
                        value={newVillageForm.contactNo}
                        onChange={(e) => setNewVillageForm({ ...newVillageForm, contactNo: e.target.value })}
                        onKeyDown={handleNewInlineKeyDown}
                        className="w-full px-2 py-1 text-xs bg-white border border-blue-400 rounded focus:outline-hidden"
                      />
                    </td>
                    <td className="py-2.5 px-2">
                      <input
                        type="text"
                        placeholder="Notes"
                        value={newVillageForm.misc}
                        onChange={(e) => setNewVillageForm({ ...newVillageForm, misc: e.target.value })}
                        onKeyDown={handleNewInlineKeyDown}
                        className="w-full px-2 py-1 text-xs bg-white border border-blue-400 rounded focus:outline-hidden"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={handleSaveNewInline}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs flex items-center gap-1 shadow-xs transition"
                          title="Save new village (Enter)"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={() => setIsAddingInline(false)}
                          className="px-2 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded text-xs transition"
                          title="Cancel (Esc)"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {/* DIRECT INLINE EDITING ROWS & STANDARD ROWS */}
                {paginatedVillages.map((village, idx) => {
                  const displayIndex =
                    pageSize === -1
                      ? idx + 1
                      : (currentPage - 1) * pageSize + idx + 1;

                  const isEditingThis = editingId === village.id;

                  if (isEditingThis) {
                    return (
                      <tr
                        key={village.id}
                        className="bg-blue-50/90 ring-2 ring-blue-500/40 transition"
                      >
                        {/* Sl. No. */}
                        <td className="py-2.5 px-3 text-center font-bold text-blue-900">
                          {village.slNo || displayIndex}
                        </td>

                        {/* Editable Name */}
                        <td className="py-2.5 px-2">
                          <input
                            ref={nameInputRef}
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            onKeyDown={handleInlineKeyDown}
                            className="w-full px-2 py-1 text-xs font-bold bg-white border border-blue-500 rounded focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                          />
                        </td>

                        {/* Editable Region */}
                        <td className="py-2.5 px-2">
                          <select
                            value={editForm.region}
                            onChange={(e) => {
                              const r = e.target.value as RegionKey;
                              setEditForm({
                                ...editForm,
                                region: r,
                                longphang: DEFAULT_LONGPHANGS[r],
                              });
                            }}
                            className="w-full px-2 py-1 text-xs bg-white border border-blue-500 rounded focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                          >
                            <option value="North">North</option>
                            <option value="East">East</option>
                            <option value="West">West</option>
                            <option value="South">South</option>
                          </select>
                        </td>

                        {/* Editable Longphang */}
                        <td className="py-2.5 px-2">
                          <input
                            type="text"
                            value={editForm.longphang}
                            onChange={(e) => setEditForm({ ...editForm, longphang: e.target.value })}
                            onKeyDown={handleInlineKeyDown}
                            className="w-full px-2 py-1 text-xs bg-white border border-blue-500 rounded focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                          />
                        </td>

                        {/* Editable Votes */}
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            placeholder="Blank"
                            value={editForm.votes}
                            onChange={(e) => setEditForm({ ...editForm, votes: e.target.value })}
                            onKeyDown={handleInlineKeyDown}
                            className="w-16 px-1.5 py-1 text-xs text-center font-bold bg-white border border-blue-500 rounded focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                          />
                        </td>

                        {/* Editable President */}
                        <td className="py-2.5 px-2">
                          <input
                            type="text"
                            placeholder="President"
                            value={editForm.president}
                            onChange={(e) => setEditForm({ ...editForm, president: e.target.value })}
                            onKeyDown={handleInlineKeyDown}
                            className="w-full px-2 py-1 text-xs bg-white border border-blue-500 rounded focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                          />
                        </td>

                        {/* Editable Contact */}
                        <td className="py-2.5 px-2">
                          <input
                            type="tel"
                            placeholder="Phone number"
                            value={editForm.contactNo}
                            onChange={(e) => setEditForm({ ...editForm, contactNo: e.target.value })}
                            onKeyDown={handleInlineKeyDown}
                            className="w-full px-2 py-1 text-xs bg-white border border-blue-500 rounded focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                          />
                        </td>

                        {/* Editable Misc */}
                        <td className="py-2.5 px-2">
                          <input
                            type="text"
                            placeholder="Notes"
                            value={editForm.misc}
                            onChange={(e) => setEditForm({ ...editForm, misc: e.target.value })}
                            onKeyDown={handleInlineKeyDown}
                            className="w-full px-2 py-1 text-xs bg-white border border-blue-500 rounded focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                          />
                        </td>

                        {/* Inline Actions */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={handleSaveInline}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-xs flex items-center gap-1 shadow-xs transition"
                              title="Save Changes (Enter)"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Save</span>
                            </button>
                            <button
                              onClick={cancelInlineEdit}
                              className="px-2 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded text-xs transition"
                              title="Cancel (Esc)"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={village.id}
                      onDoubleClick={() => startInlineEdit(village)}
                      className="hover:bg-blue-50/50 transition cursor-pointer group"
                      title="Double-click to edit this village directly"
                    >
                      {/* Sl. No. */}
                      <td className="py-3 px-3.5 text-center font-medium text-slate-500">
                        {village.slNo || displayIndex}
                      </td>

                      {/* Name of Village */}
                      <td className="py-3 px-4 font-semibold text-slate-900 group-hover:text-blue-900">
                        <div className="flex items-center gap-1.5">
                          <span>{village.name}</span>
                          <span className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-600 transition">
                            (Double-click)
                          </span>
                        </div>
                      </td>

                      {/* Region */}
                      <td className="py-3 px-3.5 text-slate-700">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            village.region === 'North'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : village.region === 'East'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : village.region === 'West'
                              ? 'bg-purple-50 text-purple-800 border border-purple-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {village.region}
                        </span>
                      </td>

                      {/* Longphang */}
                      <td className="py-3 px-3.5 text-slate-600 font-medium">
                        {village.longphang}
                      </td>

                      {/* No. of Votes */}
                      <td className="py-3 px-3.5 text-center">
                        {village.votes !== null && village.votes !== undefined ? (
                          <span className="inline-flex items-center justify-center min-w-6 px-1.5 py-0.5 rounded font-bold text-blue-900 bg-blue-100/70 text-xs">
                            {village.votes}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            —
                          </span>
                        )}
                      </td>

                      {/* President */}
                      <td className="py-3 px-4 text-slate-800">
                        {village.president ? (
                          <span>{village.president}</span>
                        ) : (
                          <span className="text-slate-400 italic">Not set</span>
                        )}
                      </td>

                      {/* Contact No. */}
                      <td className="py-3 px-4 text-slate-700">
                        {village.contactNo ? (
                          <a
                            href={`tel:${village.contactNo}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-700 hover:underline inline-flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{village.contactNo}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">Not set</span>
                        )}
                      </td>

                      {/* Misc */}
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {village.misc || <span className="text-slate-400 italic">—</span>}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startInlineEdit(village);
                            }}
                            className="p-1.5 text-blue-700 hover:bg-blue-100 rounded-md transition font-semibold flex items-center gap-1"
                            title="Edit row directly inline"
                            aria-label={`Edit ${village.name}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span className="text-[11px] hidden lg:inline">Edit</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveVillage(village);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md transition"
                            title="View Details"
                            aria-label={`View details for ${village.name}`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              exportSingleVillageToPDF(village);
                            }}
                            className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md transition"
                            title={`Download "${village.name}" official 1-page PDF dossier`}
                            aria-label={`Download PDF dossier for ${village.name}`}
                          >
                            <FileText className="w-3.5 h-3.5 text-red-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteVillage(village.id, village.name);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-md transition"
                            title="Delete Village"
                            aria-label={`Delete ${village.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Card Grid View (With Direct Inline Editing Support) */}
      {viewMode === 'cards' && filteredVillages.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedVillages.map((village, idx) => {
            const displayIndex =
              pageSize === -1 ? idx + 1 : (currentPage - 1) * pageSize + idx + 1;

            const isEditingThis = editingId === village.id;

            if (isEditingThis) {
              return (
                <div
                  key={village.id}
                  className="bg-blue-50/90 border-2 border-blue-500 rounded-xl p-4 shadow-md space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900">
                      Edit #{village.slNo}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleSaveInline}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center gap-1 transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={cancelInlineEdit}
                        className="px-2 py-1 bg-white border border-slate-300 text-slate-700 rounded text-xs transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Village Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Region</label>
                      <select
                        value={editForm.region}
                        onChange={(e) => {
                          const r = e.target.value as RegionKey;
                          setEditForm({
                            ...editForm,
                            region: r,
                            longphang: DEFAULT_LONGPHANGS[r],
                          });
                        }}
                        className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                      >
                        <option value="North">North</option>
                        <option value="East">East</option>
                        <option value="West">West</option>
                        <option value="South">South</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Votes</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Blank"
                        value={editForm.votes}
                        onChange={(e) => setEditForm({ ...editForm, votes: e.target.value })}
                        className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">President</label>
                    <input
                      type="text"
                      placeholder="President name"
                      value={editForm.president}
                      onChange={(e) => setEditForm({ ...editForm, president: e.target.value })}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Contact No.</label>
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={editForm.contactNo}
                      onChange={(e) => setEditForm({ ...editForm, contactNo: e.target.value })}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded"
                    />
                  </div>
                </div>
              );
            }

            return (
              <div
                key={village.id}
                onDoubleClick={() => startInlineEdit(village)}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs hover:border-blue-400 hover:shadow-sm transition flex flex-col justify-between cursor-pointer group"
                title="Double-click to edit this village directly"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">
                        #{village.slNo || displayIndex}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-900 leading-snug">
                        {village.name}
                      </h3>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        village.region === 'North'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : village.region === 'East'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : village.region === 'West'
                          ? 'bg-purple-50 text-purple-800 border border-purple-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {village.region}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    Longphang: <strong className="text-slate-700">{village.longphang}</strong>
                  </p>

                  <div className="mt-3.5 space-y-2 text-xs border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Vote className="w-3.5 h-3.5 text-blue-700" />
                        Votes:
                      </span>
                      <span className="font-bold text-slate-900">
                        {village.votes !== null && village.votes !== undefined ? (
                          `${village.votes} Votes`
                        ) : (
                          <span className="text-slate-400 font-normal italic">Unrecorded</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        President:
                      </span>
                      <span className="text-slate-800 font-medium">
                        {village.president || <span className="text-slate-400 italic">Not set</span>}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        Contact:
                      </span>
                      {village.contactNo ? (
                        <a
                          href={`tel:${village.contactNo}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-700 hover:underline"
                        >
                          {village.contactNo}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">Not set</span>
                      )}
                    </div>

                    {village.misc && (
                      <div className="pt-1.5 text-slate-600 text-[11px] bg-slate-50 p-2 rounded border border-slate-100">
                        {village.misc}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-blue-700 font-medium group-hover:underline flex items-center gap-1">
                    <MousePointerClick className="w-3 h-3" />
                    Double-click to edit
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startInlineEdit(village);
                      }}
                      className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportSingleVillageToPDF(village);
                      }}
                      className="p-1 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded transition"
                      title={`Download "${village.name}" PDF dossier`}
                      aria-label={`Download PDF dossier for ${village.name}`}
                    >
                      <FileText className="w-3.5 h-3.5 text-red-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteVillage(village.id, village.name);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-700 rounded transition"
                      title="Delete"
                      aria-label={`Delete ${village.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pageSize !== -1 && totalPages > 1 && (
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-slate-600">
            Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>

            {/* Quick page buttons */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 3 + i;
                  if (pageNum > totalPages) pageNum = totalPages - 4 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-md text-xs font-medium transition ${
                      currentPage === pageNum
                        ? 'bg-blue-700 text-white font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Village Details Drawer Modal (Only for View, Not for Edit) */}
      {activeVillage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-blue-900 text-white p-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-blue-800 px-2 py-0.5 rounded font-semibold text-blue-100">
                    Sl. No. {activeVillage.slNo}
                  </span>
                  <span className="text-xs text-blue-200">
                    Region: {activeVillage.region} ({activeVillage.longphang})
                  </span>
                </div>
                <h3 className="text-xl font-bold mt-1.5 text-white">
                  {activeVillage.name}
                </h3>
              </div>
              <button
                onClick={() => setActiveVillage(null)}
                className="text-blue-200 hover:text-white p-1 rounded-lg transition"
                aria-label="Close details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <div>
                  <span className="block text-slate-500 text-xs">Official Recorded Votes</span>
                  <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                    {activeVillage.votes !== null && activeVillage.votes !== undefined
                      ? `${activeVillage.votes} Votes`
                      : 'Unrecorded / Blank'}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 text-xs">Longphang Zone</span>
                  <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                    {activeVillage.longphang}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="block text-xs text-slate-500">Village President</span>
                    <span className="text-slate-900 font-medium">
                      {activeVillage.president || (
                        <span className="text-slate-400 italic">No president name recorded</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="block text-xs text-slate-500">Contact Number</span>
                    {activeVillage.contactNo ? (
                      <a
                        href={`tel:${activeVillage.contactNo}`}
                        className="text-blue-700 font-semibold hover:underline"
                      >
                        {activeVillage.contactNo}
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">No telephone number registered</span>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div>
                    <span className="block text-xs text-slate-500">Miscellaneous Notes</span>
                    <p className="text-slate-700 mt-0.5 whitespace-pre-wrap">
                      {activeVillage.misc || (
                        <span className="text-slate-400 italic">No special remarks or notes.</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Record ID: {activeVillage.id}</span>
                <span>Last updated: {new Date(activeVillage.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <button
                onClick={() => {
                  exportSingleVillageToPDF(activeVillage);
                }}
                className="px-3.5 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs"
                title="Download 1-page Official PDF Dossier with all particulars"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Export Village PDF</span>
              </button>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setActiveVillage(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    const target = activeVillage;
                    setActiveVillage(null);
                    startInlineEdit(target);
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-xs font-semibold text-white transition shadow-sm"
                >
                  Edit Inline Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export PDF Modal */}
      {isExportPdfOpen && (
        <ExportPdfModal
          isOpen={isExportPdfOpen}
          onClose={() => {
            setIsExportPdfOpen(false);
            setTargetVillageForPdf(null);
          }}
          villages={villages}
          initialSelectedVillage={targetVillageForPdf}
          activeFilterRegion={selectedRegion}
          filteredVillages={filteredVillages}
        />
      )}
    </div>
  );
};
