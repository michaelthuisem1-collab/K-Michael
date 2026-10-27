/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RegionKey = 'North' | 'East' | 'West' | 'South';

export interface VillageRecord {
  id: string;
  slNo: number; // Original document reference Sl. No. within region
  name: string;
  region: RegionKey;
  longphang: string; // e.g. Ato, Zingsho, Zingtun, Aze
  votes: number | null; // null represents unrecorded / blank in original document
  president: string;
  contactNo: string;
  misc: string;
  updatedAt: string; // ISO date string
  isFlagged?: boolean;
}

export type ViewMode = 'table' | 'cards';

export type MissingInfoFilter = 'all' | 'missing-votes' | 'missing-president' | 'missing-contact' | 'any-missing' | 'complete';

export type SortField = 'name' | 'region' | 'votes' | 'slNo' | 'updatedAt';
export type SortOrder = 'asc' | 'desc';

export interface DirectoryFilterState {
  searchQuery: string;
  region: RegionKey | 'all';
  missingFilter: MissingInfoFilter;
  sortBy: SortField;
  sortOrder: SortOrder;
  page: number;
  pageSize: number;
  viewMode: ViewMode;
}

export interface BackupPayload {
  version: number;
  appName: string;
  exportedAt: string;
  totalRecords: number;
  records: VillageRecord[];
}

export interface StorageInfo {
  supported: boolean;
  count: number;
  lastBackupDate: string | null;
  storageUsageEstimate?: string;
}

export interface ImportPreviewResult {
  validRecords: Partial<VillageRecord>[];
  duplicates: { existing: VillageRecord; imported: Partial<VillageRecord> }[];
  invalidRows: { rowNumber: number; reason: string; raw: Record<string, string> }[];
}
