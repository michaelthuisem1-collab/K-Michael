/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  Compass,
  Vote,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ArrowRight,
  Clock,
  Phone,
  User,
  Award,
  PieChart as PieIcon,
  BarChart3,
  Check,
  X,
  Edit2,
  MousePointerClick,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { RegionKey, VillageRecord } from '../types/village';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ExportPdfModal } from '../components/ExportPdfModal';
import { exportSingleVillageToPDF } from '../services/pdfExport';

interface DashboardProps {
  villages: VillageRecord[];
  onNavigateToDirectory: (regionFilter?: RegionKey | 'all', missingFilter?: any) => void;
  onOpenAddModal: () => void;
  onEditVillage?: (village: VillageRecord) => void;
  onSaveVillage: (record: VillageRecord) => Promise<void>;
}

// Region palette colors
const REGION_COLORS: Record<RegionKey, string> = {
  North: '#2563eb', // Royal Blue
  East: '#059669',  // Emerald Green
  West: '#7c3aed',  // Purple / Violet
  South: '#d97706', // Amber / Warm Ochre
};

const DEFAULT_LONGPHANGS: Record<RegionKey, string> = {
  North: 'Ato',
  East: 'Zingsho',
  West: 'Zingtun',
  South: 'Aze',
};

export const Dashboard: React.FC<DashboardProps> = ({
  villages,
  onNavigateToDirectory,
  onOpenAddModal,
  onSaveVillage,
}) => {
  // Direct inline editing state for the Dashboard's Recent Records table
  const [editingRecentId, setEditingRecentId] = useState<string | null>(null);
  const [recentEditForm, setRecentEditForm] = useState<{
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

  const [recentInlineNotice, setRecentInlineNotice] = useState<string>('');
  const [isExportPdfOpen, setIsExportPdfOpen] = useState<boolean>(false);

  const startRecentInlineEdit = (village: VillageRecord) => {
    setEditingRecentId(village.id);
    setRecentEditForm({
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

  const cancelRecentInlineEdit = () => {
    setEditingRecentId(null);
  };

  const handleSaveRecentInline = async () => {
    if (!recentEditForm.name.trim()) return;

    let voteCount: number | null = null;
    if (recentEditForm.votes.trim() !== '') {
      const parsed = parseInt(recentEditForm.votes.trim(), 10);
      if (!isNaN(parsed) && parsed >= 0) {
        voteCount = parsed;
      }
    }

    const updated: VillageRecord = {
      id: recentEditForm.id,
      slNo: recentEditForm.slNo,
      name: recentEditForm.name.trim(),
      region: recentEditForm.region,
      longphang: recentEditForm.longphang.trim() || DEFAULT_LONGPHANGS[recentEditForm.region],
      votes: voteCount,
      president: recentEditForm.president.trim(),
      contactNo: recentEditForm.contactNo.trim(),
      misc: recentEditForm.misc.trim(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await onSaveVillage(updated);
      setEditingRecentId(null);
      setRecentInlineNotice(`Saved "${updated.name}" directly!`);
      setTimeout(() => setRecentInlineNotice(''), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRecentKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveRecentInline();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRecentInlineEdit();
    }
  };

  // Statistics computation
  const stats = useMemo(() => {
    const totalVillages = villages.length;

    const regions: Record<RegionKey, { count: number; votes: number; missingVotes: number; longphang: string }> = {
      North: { count: 0, votes: 0, missingVotes: 0, longphang: 'Ato' },
      East: { count: 0, votes: 0, missingVotes: 0, longphang: 'Zingsho' },
      West: { count: 0, votes: 0, missingVotes: 0, longphang: 'Zingtun' },
      South: { count: 0, votes: 0, missingVotes: 0, longphang: 'Aze' },
    };

    let totalRecordedVotes = 0;
    let villagesWithRecordedVotes = 0;
    let villagesWithMissingVotes = 0;
    let villagesWithPresident = 0;
    let villagesWithContact = 0;
    let villagesWithAnyMissing = 0;

    villages.forEach((v) => {
      const reg = regions[v.region] || regions.North;
      reg.count += 1;

      // Distinguish null/missing vote from actual 0
      if (v.votes !== null && v.votes !== undefined && !isNaN(Number(v.votes))) {
        totalRecordedVotes += Number(v.votes);
        reg.votes += Number(v.votes);
        villagesWithRecordedVotes += 1;
      } else {
        villagesWithMissingVotes += 1;
        reg.missingVotes += 1;
      }

      if (v.president && v.president.trim().length > 0) {
        villagesWithPresident += 1;
      }
      if (v.contactNo && v.contactNo.trim().length > 0) {
        villagesWithContact += 1;
      }

      const hasMissingInfo =
        v.votes === null ||
        !v.president ||
        v.president.trim() === '' ||
        !v.contactNo ||
        v.contactNo.trim() === '';
      if (hasMissingInfo) {
        villagesWithAnyMissing += 1;
      }
    });

    // Recently modified records (sorted descending by updatedAt)
    const recentlyUpdated = [...villages]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 7);

    return {
      totalVillages,
      totalRecordedVotes,
      villagesWithRecordedVotes,
      villagesWithMissingVotes,
      villagesWithPresident,
      villagesWithContact,
      villagesWithAnyMissing,
      regions,
      recentlyUpdated,
    };
  }, [villages]);

  const regionKeys: RegionKey[] = ['North', 'East', 'West', 'South'];

  // Recharts Data: Regional Distribution for Pie Chart
  const pieChartData = useMemo(() => {
    return regionKeys.map((key) => {
      const reg = stats.regions[key];
      const pct = stats.totalVillages > 0 ? ((reg.count / stats.totalVillages) * 100).toFixed(1) : '0';
      return {
        name: `${key} (${reg.longphang})`,
        regionKey: key,
        value: reg.count,
        percentage: pct,
        fill: REGION_COLORS[key],
      };
    });
  }, [stats, regionKeys]);

  // Recharts Data: Top 5 Villages by Recorded Vote Count
  const topVillagesByVotes = useMemo(() => {
    return [...villages]
      .filter((v) => v.votes !== null && v.votes !== undefined && !isNaN(Number(v.votes)))
      .sort((a, b) => Number(b.votes) - Number(a.votes))
      .slice(0, 5)
      .map((v) => ({
        name: v.name,
        votes: Number(v.votes),
        region: v.region,
        longphang: v.longphang,
        fill: REGION_COLORS[v.region] || '#1d4ed8',
      }));
  }, [villages]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block px-2.5 py-0.5 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 rounded-md">
              Tangkhul Naga Autonomous Directory
            </span>
            <span className="text-xs text-slate-500">• 4 Traditional Longphangs</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Directory Overview & Live Statistics
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Tracking {stats.totalVillages} villages across Ato (North), Zingsho (East), Zingtun (West), and Aze (South). Double-click records to edit directly.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsExportPdfOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-200 bg-red-50 text-xs sm:text-sm font-semibold text-red-800 hover:bg-red-100 transition shadow-xs"
            title="Export official directory or village dossiers as PDF"
          >
            <FileText className="w-4 h-4 text-red-700" />
            <span>Export PDF</span>
          </button>

          <button
            onClick={() => onNavigateToDirectory('all')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition shadow-xs"
          >
            <span>Browse Directory</span>
            <ArrowRight className="w-4 h-4 text-slate-500" />
          </button>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-xs sm:text-sm font-semibold text-white transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Village</span>
          </button>
        </div>
      </div>

      {recentInlineNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{recentInlineNotice}</span>
        </div>
      )}

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Villages */}
        <div
          onClick={() => onNavigateToDirectory('all')}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-blue-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Villages
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Compass className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{stats.totalVillages}</span>
            <span className="text-xs text-slate-500">records active</span>
          </div>
          <div className="mt-2 text-xs text-slate-600">
            Across 4 administrative regions
          </div>
        </div>

        {/* Card 2: Recorded Votes */}
        <div
          onClick={() => onNavigateToDirectory('all')}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-blue-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Recorded Votes
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Vote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{stats.totalRecordedVotes}</span>
            <span className="text-xs text-slate-500">total votes</span>
          </div>
          <div className="mt-2 text-xs text-slate-600 flex items-center justify-between">
            <span>In {stats.villagesWithRecordedVotes} villages</span>
            <span className="text-slate-400">({stats.villagesWithMissingVotes} unrecorded)</span>
          </div>
        </div>

        {/* Card 3: Missing Information */}
        <div
          onClick={() => onNavigateToDirectory('all', 'any-missing')}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-amber-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Missing Info
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-800">{stats.villagesWithAnyMissing}</span>
            <span className="text-xs text-slate-500">need update</span>
          </div>
          <div className="mt-2 text-xs text-slate-600">
            {stats.villagesWithMissingVotes} votes, {stats.totalVillages - stats.villagesWithPresident} presidents pending
          </div>
        </div>

        {/* Card 4: Complete Records */}
        <div
          onClick={() => onNavigateToDirectory('all', 'complete')}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-emerald-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Fully Populated
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-800">
              {stats.totalVillages - stats.villagesWithAnyMissing}
            </span>
            <span className="text-xs text-slate-500">all fields set</span>
          </div>
          <div className="mt-2 text-xs text-slate-600">
            {stats.villagesWithPresident} presidents, {stats.villagesWithContact} contacts
          </div>
        </div>
      </div>

      {/* 4 Regional Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {regionKeys.map((key) => {
          const reg = stats.regions[key];
          const pct = Math.round((reg.count / (stats.totalVillages || 1)) * 100);

          return (
            <div
              key={key}
              onClick={() => onNavigateToDirectory(key)}
              className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-xs hover:border-blue-400 hover:shadow-sm transition cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {key} Region
                  </h3>
                  <p className="text-xs text-blue-700 font-medium">Longphang: {reg.longphang}</p>
                </div>
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  {pct}%
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900">{reg.count}</span>
                <span className="text-xs text-slate-600 font-medium">
                  {reg.votes} recorded votes
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-2.5 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>{reg.missingVotes} unrecorded votes</span>
                <span className="text-blue-700 hover:underline">View villages →</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================= */}
      {/* RECHARTS VISUALIZATIONS SECTION: PIE CHART & BAR CHART    */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
        {/* Recharts Chart 1: Distribution of Villages Across Regions (Pie Chart) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                  <PieIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Regional Distribution of Villages
                  </h3>
                  <p className="text-xs text-slate-500">
                    Distribution across the 4 Longphangs
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                {stats.totalVillages} Total
              </span>
            </div>

            {/* Pie Chart Canvas Container */}
            <div className="mt-4 w-full h-64 min-w-0">
              <ErrorBoundary
                fallback={
                  <div className="h-64 flex items-center justify-center text-xs text-slate-500">
                    Unable to display chart in current viewport
                  </div>
                }
              >
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <RechartsTooltip
                      formatter={(val: any, name: any) => [
                        `${val} Villages (${stats.totalVillages > 0 ? ((Number(val) / stats.totalVillages) * 100).toFixed(1) : 0}%)`,
                        name,
                      ]}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      formatter={(value) => (
                        <span className="text-xs font-medium text-slate-700 ml-1">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ErrorBoundary>
            </div>
          </div>

          {/* Bottom regional pill breakdown */}
          <div className="mt-2 pt-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            {pieChartData.map((item) => (
              <button
                key={item.regionKey}
                onClick={() => onNavigateToDirectory(item.regionKey as RegionKey)}
                className="p-2 rounded-lg bg-slate-50 hover:bg-blue-50 transition border border-slate-100 text-left"
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="font-bold text-slate-800 text-[11px] truncate">{item.regionKey}</span>
                </div>
                <div className="text-slate-600 text-[11px]">
                  <strong>{item.value}</strong> ({item.percentage}%)
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recharts Chart 2: Top 5 Villages by Vote Count (Bar Chart) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Top 5 Villages by Vote Count
                  </h3>
                  <p className="text-xs text-slate-500">
                    Highest voting representation in the Tangkhul directory
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md flex items-center gap-1">
                <Award className="w-3 h-3 text-indigo-600" />
                Ranked
              </span>
            </div>

            {/* Bar Chart Canvas Container */}
            <div className="mt-4 w-full h-64 min-w-0">
              <ErrorBoundary
                fallback={
                  <div className="h-64 flex items-center justify-center text-xs text-slate-500">
                    Unable to display chart in current viewport
                  </div>
                }
              >
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={topVillagesByVotes}
                    margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#475569' }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      domain={[0, 'dataMax + 2']}
                      allowDecimals={false}
                    />
                    <RechartsTooltip
                      formatter={(val: any) => [`${val} Votes`, 'Recorded Votes']}
                      labelFormatter={(label: any) => `Village: ${label}`}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Bar
                      dataKey="votes"
                      radius={[6, 6, 0, 0]}
                    >
                      {topVillagesByVotes.map((entry, index) => (
                        <Cell
                          key={`bar-${index}`}
                          fill={entry.fill}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ErrorBoundary>
            </div>
          </div>

          {/* Top 5 Legend / Details row */}
          <div className="mt-2 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
            <span className="text-[11px] text-slate-500">
              Leading: <strong>Hunphun & Hungpung</strong> (10 votes each)
            </span>
            <button
              onClick={() => onNavigateToDirectory('all')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center gap-1"
            >
              <span>Explore all rankings</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Directory Completeness Meter */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          Directory Field Completeness
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Tracking the progress of administrative contact collection
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Votes */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Vote className="w-3.5 h-3.5 text-blue-700" />
                Vote Distribution
              </span>
              <span>{Math.round((stats.villagesWithRecordedVotes / (stats.totalVillages || 1)) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-700 h-2 rounded-full"
                style={{
                  width: `${(stats.villagesWithRecordedVotes / (stats.totalVillages || 1)) * 100}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {stats.villagesWithRecordedVotes} of {stats.totalVillages} villages documented
            </p>
          </div>

          {/* Presidents */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-700" />
                Village Presidents
              </span>
              <span>{Math.round((stats.villagesWithPresident / (stats.totalVillages || 1)) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-700 h-2 rounded-full"
                style={{
                  width: `${(stats.villagesWithPresident / (stats.totalVillages || 1)) * 100}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {stats.villagesWithPresident} presidents assigned
            </p>
          </div>

          {/* Contact Numbers */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-700" />
                Contact Numbers
              </span>
              <span>{Math.round((stats.villagesWithContact / (stats.totalVillages || 1)) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-700 h-2 rounded-full"
                style={{
                  width: `${(stats.villagesWithContact / (stats.totalVillages || 1)) * 100}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              {stats.villagesWithContact} telephone contacts saved
            </p>
          </div>
        </div>
      </div>

      {/* Recently Updated Records (With Double-Click Direct Inline Editing) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Recently Updated Records
            </h3>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium">
              <MousePointerClick className="w-3 h-3 text-blue-600" />
              Double-click row to edit directly
            </span>
          </div>
          <button
            onClick={() => onNavigateToDirectory('all')}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline"
          >
            View all directory →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 min-w-[130px]">Village</th>
                <th className="py-2.5 px-4 min-w-[110px]">Region</th>
                <th className="py-2.5 px-4 text-center min-w-[80px]">Votes</th>
                <th className="py-2.5 px-4 min-w-[130px]">President</th>
                <th className="py-2.5 px-4 min-w-[120px]">Contact</th>
                <th className="py-2.5 px-4 text-right min-w-[90px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recentlyUpdated.map((village) => {
                const isEditing = editingRecentId === village.id;

                if (isEditing) {
                  return (
                    <tr key={village.id} className="bg-blue-50/90 ring-2 ring-blue-500/40 transition">
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={recentEditForm.name}
                          onChange={(e) => setRecentEditForm({ ...recentEditForm, name: e.target.value })}
                          onKeyDown={handleRecentKeyDown}
                          autoFocus
                          className="w-full px-2 py-1 text-xs font-bold bg-white border border-blue-500 rounded"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={recentEditForm.region}
                          onChange={(e) => {
                            const r = e.target.value as RegionKey;
                            setRecentEditForm({
                              ...recentEditForm,
                              region: r,
                              longphang: DEFAULT_LONGPHANGS[r],
                            });
                          }}
                          className="w-full px-1.5 py-1 text-xs bg-white border border-blue-500 rounded"
                        >
                          <option value="North">North</option>
                          <option value="East">East</option>
                          <option value="West">West</option>
                          <option value="South">South</option>
                        </select>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          placeholder="Blank"
                          value={recentEditForm.votes}
                          onChange={(e) => setRecentEditForm({ ...recentEditForm, votes: e.target.value })}
                          onKeyDown={handleRecentKeyDown}
                          className="w-16 px-1.5 py-1 text-xs text-center font-bold bg-white border border-blue-500 rounded"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          placeholder="President"
                          value={recentEditForm.president}
                          onChange={(e) => setRecentEditForm({ ...recentEditForm, president: e.target.value })}
                          onKeyDown={handleRecentKeyDown}
                          className="w-full px-2 py-1 text-xs bg-white border border-blue-500 rounded"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="tel"
                          placeholder="Contact"
                          value={recentEditForm.contactNo}
                          onChange={(e) => setRecentEditForm({ ...recentEditForm, contactNo: e.target.value })}
                          onKeyDown={handleRecentKeyDown}
                          className="w-full px-2 py-1 text-xs bg-white border border-blue-500 rounded"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={handleSaveRecentInline}
                            className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold shadow-xs transition"
                            title="Save Changes (Enter)"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={cancelRecentInlineEdit}
                            className="p-1 bg-white border border-slate-300 text-slate-700 rounded transition"
                            title="Cancel (Esc)"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={village.id}
                    onDoubleClick={() => startRecentInlineEdit(village)}
                    className="hover:bg-blue-50/60 transition cursor-pointer group"
                    title="Double-click to edit directly"
                  >
                    <td className="py-3 px-4 font-semibold text-slate-900 group-hover:text-blue-900">
                      <div className="flex items-center gap-1.5">
                        <span>{village.name}</span>
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] text-blue-600 transition">
                          (Double-click)
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        {village.region} — {village.longphang}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {village.votes !== null ? (
                        <span className="font-bold text-blue-800">{village.votes}</span>
                      ) : (
                        <span className="text-slate-400 italic font-normal">Unrecorded</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {village.president || (
                        <span className="text-slate-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {village.contactNo || (
                        <span className="text-slate-400 italic">Not set</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportSingleVillageToPDF(village);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-red-700 hover:bg-red-50 transition"
                          title={`Download "${village.name}" official 1-page PDF dossier`}
                          aria-label={`Download PDF dossier for ${village.name}`}
                        >
                          <FileText className="w-3.5 h-3.5 text-red-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startRecentInlineEdit(village);
                          }}
                          className="px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition text-xs inline-flex items-center gap-1"
                          title="Edit inline"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Edit</span>
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
