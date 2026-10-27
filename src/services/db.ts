/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { INITIAL_VILLAGES } from '../data/initialVillages';
import { BackupPayload, StorageInfo, VillageRecord } from '../types/village';

const DB_NAME = 'TangkhulVillageDirectoryDB';
const DB_VERSION = 1;
const STORE_NAME = 'villages';
const LOCAL_STORAGE_KEY = 'tangkhul_local_villages_cache';

let dbInstance: IDBDatabase | null = null;
let useLocalStorageFallback = false;

// Helpers for localStorage fallback
function getFromLocalStorage(): VillageRecord[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read from localStorage:', e);
  }
  return null;
}

function saveToLocalStorage(records: VillageRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn('Could not write to localStorage:', e);
  }
}

export async function getDB(): Promise<IDBDatabase | null> {
  if (useLocalStorageFallback) return null;
  if (dbInstance) return dbInstance;

  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      useLocalStorageFallback = true;
      resolve(null);
      return;
    }

    // Safety timeout to prevent hanging inside restricted iframes
    const timer = setTimeout(() => {
      console.warn('IndexedDB connection timed out. Falling back to in-memory/localStorage persistence.');
      useLocalStorageFallback = true;
      resolve(null);
    }, 1500);

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onblocked = () => {
        clearTimeout(timer);
        console.warn('IndexedDB open was blocked.');
        useLocalStorageFallback = true;
        resolve(null);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('region', 'region', { unique: false });
          store.createIndex('slNo', 'slNo', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });

          // Populate initial 233 villages on first database creation
          INITIAL_VILLAGES.forEach((village) => {
            store.put(village);
          });
        }
      };

      request.onsuccess = (event) => {
        clearTimeout(timer);
        dbInstance = (event.target as IDBOpenDBRequest).result;

        dbInstance.onversionchange = () => {
          dbInstance?.close();
          dbInstance = null;
        };

        resolve(dbInstance);
      };

      request.onerror = () => {
        clearTimeout(timer);
        console.warn('IndexedDB failed to open:', request.error);
        useLocalStorageFallback = true;
        resolve(null);
      };
    } catch (err) {
      clearTimeout(timer);
      console.warn('IndexedDB exception:', err);
      useLocalStorageFallback = true;
      resolve(null);
    }
  });
}

/**
 * Ensures database is initialized and contains default records if empty.
 */
export async function initDatabase(): Promise<VillageRecord[]> {
  try {
    const db = await getDB();
    if (!db) {
      // Use localStorage cache or initial default
      const cached = getFromLocalStorage();
      if (cached && cached.length > 0) {
        return cached;
      }
      saveToLocalStorage(INITIAL_VILLAGES);
      return INITIAL_VILLAGES;
    }

    const records = await getAllVillages();
    if (records.length === 0) {
      await bulkUpsertVillages(INITIAL_VILLAGES);
      saveToLocalStorage(INITIAL_VILLAGES);
      return INITIAL_VILLAGES;
    }

    saveToLocalStorage(records);
    return records;
  } catch (err) {
    console.warn('initDatabase fallback to initial villages:', err);
    const cached = getFromLocalStorage();
    return cached && cached.length > 0 ? cached : INITIAL_VILLAGES;
  }
}

/**
 * Fetch all villages from IndexedDB (or fallback cache)
 */
export async function getAllVillages(): Promise<VillageRecord[]> {
  const db = await getDB();
  if (!db) {
    const local = getFromLocalStorage();
    return local && local.length > 0 ? local : INITIAL_VILLAGES;
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const result = request.result as VillageRecord[];
        if (result && result.length > 0) {
          saveToLocalStorage(result);
          resolve(result);
        } else {
          resolve(INITIAL_VILLAGES);
        }
      };

      request.onerror = () => {
        const local = getFromLocalStorage();
        resolve(local && local.length > 0 ? local : INITIAL_VILLAGES);
      };
    } catch {
      const local = getFromLocalStorage();
      resolve(local && local.length > 0 ? local : INITIAL_VILLAGES);
    }
  });
}

/**
 * Get village by ID
 */
export async function getVillageById(id: string): Promise<VillageRecord | null> {
  const all = await getAllVillages();
  return all.find((v) => v.id === id) || null;
}

/**
 * Save (create or update) a single village record
 */
export async function saveVillage(record: VillageRecord): Promise<VillageRecord> {
  const updatedRecord: VillageRecord = {
    ...record,
    updatedAt: new Date().toISOString(),
  };

  const db = await getDB();
  if (!db) {
    const existing = getFromLocalStorage() || [...INITIAL_VILLAGES];
    const idx = existing.findIndex((v) => v.id === updatedRecord.id);
    if (idx !== -1) {
      existing[idx] = updatedRecord;
    } else {
      existing.push(updatedRecord);
    }
    saveToLocalStorage(existing);
    markRecordModified();
    return updatedRecord;
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(updatedRecord);

      request.onsuccess = () => {
        markRecordModified();
        // also keep localStorage synced
        getAllVillages().then((all) => saveToLocalStorage(all));
        resolve(updatedRecord);
      };

      request.onerror = () => {
        reject(new Error(request.error?.message || 'Failed to save record to IndexedDB.'));
      };
    } catch (e: any) {
      reject(new Error(e?.message || 'Transaction error saving record'));
    }
  });
}

/**
 * Delete a village record by ID
 */
export async function deleteVillage(id: string): Promise<void> {
  const db = await getDB();
  if (!db) {
    const existing = getFromLocalStorage() || [...INITIAL_VILLAGES];
    const filtered = existing.filter((v) => v.id !== id);
    saveToLocalStorage(filtered);
    markRecordModified();
    return;
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        markRecordModified();
        getAllVillages().then((all) => saveToLocalStorage(all));
        resolve();
      };

      request.onerror = () => {
        reject(new Error(request.error?.message || 'Failed to delete record.'));
      };
    } catch (e: any) {
      reject(new Error(e?.message || 'Transaction error deleting record'));
    }
  });
}

/**
 * Bulk insert or update villages
 */
export async function bulkUpsertVillages(records: VillageRecord[]): Promise<number> {
  saveToLocalStorage(records);

  const db = await getDB();
  if (!db) {
    markRecordModified();
    return records.length;
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      let count = 0;
      records.forEach((record) => {
        store.put(record);
        count++;
      });

      tx.oncomplete = () => {
        markRecordModified();
        resolve(count);
      };

      tx.onerror = () => {
        reject(new Error(tx.error?.message || 'Transaction failed during bulk update.'));
      };
    } catch (e: any) {
      reject(new Error(e?.message || 'Bulk upsert error'));
    }
  });
}

/**
 * Restore from backup payload (replaces or merges)
 */
export async function restoreBackup(
  records: VillageRecord[],
  mode: 'replace' | 'merge'
): Promise<{ imported: number; updated: number }> {
  if (mode === 'replace') {
    await clearAllVillages();
    const count = await bulkUpsertVillages(records);
    return { imported: count, updated: 0 };
  } else {
    const existing = await getAllVillages();
    const existingMap = new Map(existing.map((v) => [v.id, v]));
    let imported = 0;
    let updated = 0;

    const merged = [...existing];
    records.forEach((rec) => {
      const idx = merged.findIndex((v) => v.id === rec.id || v.name.toLowerCase() === rec.name.toLowerCase());
      if (idx !== -1) {
        merged[idx] = rec;
        updated++;
      } else {
        merged.push(rec);
        imported++;
      }
    });

    await bulkUpsertVillages(merged);
    return { imported, updated };
  }
}

/**
 * Reset database to initial original directory (233 villages)
 */
export async function resetToDefaultDataset(): Promise<VillageRecord[]> {
  await clearAllVillages();
  await bulkUpsertVillages(INITIAL_VILLAGES);
  saveToLocalStorage(INITIAL_VILLAGES);
  return INITIAL_VILLAGES;
}

/**
 * Clear all records from IndexedDB and local cache
 */
export async function clearAllVillages(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }

  const db = await getDB();
  if (!db) {
    markRecordModified();
    return;
  }

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        markRecordModified();
        resolve();
      };

      request.onerror = () => {
        reject(new Error(request.error?.message || 'Failed to clear records.'));
      };
    } catch (e: any) {
      reject(new Error(e?.message || 'Clear transaction error'));
    }
  });
}

/**
 * Get current storage information and estimates
 */
export async function getStorageInfo(): Promise<StorageInfo> {
  const supported = typeof window !== 'undefined' && 'indexedDB' in window;
  let count = 0;
  let usageEstimate = 'Unknown';

  try {
    const records = await getAllVillages();
    count = records.length;
  } catch {
    count = 0;
  }

  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      if (est.usage !== undefined) {
        usageEstimate = `${(est.usage / (1024 * 1024)).toFixed(2)} MB`;
      }
    } catch {
      usageEstimate = 'Available';
    }
  }

  const lastBackupDate = typeof window !== 'undefined' ? localStorage.getItem('tangkhul_last_backup_at') : null;

  return {
    supported,
    count,
    lastBackupDate,
    storageUsageEstimate: usageEstimate,
  };
}

export function markRecordModified() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('tangkhul_last_modified_at', new Date().toISOString());
  }
}

export function markBackupSaved() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('tangkhul_last_backup_at', new Date().toISOString());
  }
}

export function getLastModifiedDate(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tangkhul_last_modified_at');
}

export function getLastBackupDate(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('tangkhul_last_backup_at');
}
