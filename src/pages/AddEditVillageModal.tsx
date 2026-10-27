/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { X, AlertCircle, CheckCircle2, Save, Building2 } from 'lucide-react';
import { RegionKey, VillageRecord } from '../types/village';

interface AddEditVillageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: VillageRecord) => Promise<void>;
  existingVillage?: VillageRecord | null;
  allVillages: VillageRecord[];
}

const DEFAULT_LONGPHANGS: Record<RegionKey, string> = {
  North: 'Ato',
  East: 'Zingsho',
  West: 'Zingtun',
  South: 'Aze',
};

export const AddEditVillageModal: React.FC<AddEditVillageModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingVillage,
  allVillages,
}) => {
  const isEditing = Boolean(existingVillage);

  const [name, setName] = useState('');
  const [region, setRegion] = useState<RegionKey>('North');
  const [longphang, setLongphang] = useState('Ato');
  const [votes, setVotes] = useState<string>(''); // string to distinguish empty from '0'
  const [president, setPresident] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [misc, setMisc] = useState('');
  const [slNo, setSlNo] = useState<number>(0);

  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form state
  useEffect(() => {
    if (existingVillage) {
      setName(existingVillage.name || '');
      setRegion(existingVillage.region || 'North');
      setLongphang(existingVillage.longphang || DEFAULT_LONGPHANGS[existingVillage.region] || 'Ato');
      setVotes(
        existingVillage.votes !== null && existingVillage.votes !== undefined
          ? String(existingVillage.votes)
          : ''
      );
      setPresident(existingVillage.president || '');
      setContactNo(existingVillage.contactNo || '');
      setMisc(existingVillage.misc || '');
      setSlNo(existingVillage.slNo || 0);
    } else {
      // New record defaults
      setName('');
      setRegion('North');
      setLongphang('Ato');
      setVotes('');
      setPresident('');
      setContactNo('');
      setMisc('');
      // Suggest next serial number in North region
      const northVillages = allVillages.filter((v) => v.region === 'North');
      const maxSl = northVillages.reduce((max, v) => Math.max(max, v.slNo || 0), 0);
      setSlNo(maxSl + 1);
    }
    setErrorMessage('');
  }, [existingVillage, isOpen, allVillages]);

  // When region changes in "Add" mode, auto-fill default Longphang and suggest Sl. No.
  const handleRegionChange = (newRegion: RegionKey) => {
    setRegion(newRegion);
    setLongphang(DEFAULT_LONGPHANGS[newRegion]);

    if (!isEditing) {
      const regionVillages = allVillages.filter((v) => v.region === newRegion);
      const maxSl = regionVillages.reduce((max, v) => Math.max(max, v.slNo || 0), 0);
      setSlNo(maxSl + 1);
    }
  };

  // Duplicate name detection (warnings, non-blocking)
  const duplicateWarning = useMemo(() => {
    if (!name.trim()) return null;
    const cleanName = name.trim().toLowerCase();
    const match = allVillages.find(
      (v) =>
        v.name.trim().toLowerCase() === cleanName &&
        (!existingVillage || v.id !== existingVillage.id)
    );

    if (match) {
      return `Notice: A village named "${match.name}" already exists in ${match.region} region. You can still save if this is a distinct settlement or sub-clan.`;
    }
    return null;
  }, [name, allVillages, existingVillage]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Village name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      let voteVal: number | null = null;
      if (votes.trim() !== '') {
        const parsed = parseInt(votes.trim(), 10);
        if (isNaN(parsed) || parsed < 0) {
          setErrorMessage('Vote count must be a non-negative integer or left blank.');
          setIsSubmitting(false);
          return;
        }
        voteVal = parsed;
      }

      const recordId = existingVillage ? existingVillage.id : `v-${region.toLowerCase()}-${Date.now()}`;

      const updatedRecord: VillageRecord = {
        id: recordId,
        slNo: slNo || 1,
        name: name.trim(),
        region,
        longphang: longphang.trim() || DEFAULT_LONGPHANGS[region],
        votes: voteVal,
        president: president.trim(),
        contactNo: contactNo.trim(),
        misc: misc.trim(),
        updatedAt: new Date().toISOString(),
      };

      await onSave(updatedRecord);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-blue-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-blue-300" />
            <h3 className="text-base sm:text-lg font-bold">
              {isEditing ? `Edit Village: ${existingVillage?.name}` : 'Add New Village Record'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white p-1 rounded-md transition"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {duplicateWarning && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <span>{duplicateWarning}</span>
            </div>
          )}

          {/* Village Name */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Village Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hunphun, Chingai, Somdal"
              className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            />
          </div>

          {/* Region & Longphang */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Region <span className="text-rose-600">*</span>
              </label>
              <select
                value={region}
                onChange={(e) => handleRegionChange(e.target.value as RegionKey)}
                className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg py-2 px-2.5 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value="North">North (Ato)</option>
                <option value="East">East (Zingsho)</option>
                <option value="West">West (Zingtun)</option>
                <option value="South">South (Aze)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Longphang Heading
              </label>
              <input
                type="text"
                value={longphang}
                onChange={(e) => setLongphang(e.target.value)}
                placeholder="e.g. Ato, Zingsho"
                className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Vote count & Sl. No. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Number of Votes
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={votes}
                onChange={(e) => setVotes(e.target.value)}
                placeholder="Leave blank if unrecorded"
                className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Do not enter 0 if votes are simply unknown/blank.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Serial Number (Sl. No.)
              </label>
              <input
                type="number"
                min="1"
                value={slNo || ''}
                onChange={(e) => setSlNo(parseInt(e.target.value, 10) || 1)}
                className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* President & Contact Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Village President (Optional)
              </label>
              <input
                type="text"
                value={president}
                onChange={(e) => setPresident(e.target.value)}
                placeholder="Full name of President"
                className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Contact Number (Optional)
              </label>
              <input
                type="tel"
                value={contactNo}
                onChange={(e) => setContactNo(e.target.value)}
                placeholder="e.g. +91 9876543210"
                className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Miscellaneous Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
              Miscellaneous Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={misc}
              onChange={(e) => setMisc(e.target.value)}
              placeholder="Administrative jurisdiction, headquarters, clan information, or remarks..."
              className="w-full text-sm bg-slate-50 border border-slate-300 rounded-lg py-2 px-3 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-xs sm:text-sm font-semibold text-white transition shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
