/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { RegionKey, VillageRecord } from '../types/village';

export type PDFColumnKey =
  | 'slNo'
  | 'name'
  | 'region'
  | 'longphang'
  | 'votes'
  | 'president'
  | 'contactNo'
  | 'misc'
  | 'updatedAt';

export interface ColumnDefinition {
  key: PDFColumnKey;
  label: string;
  defaultIncluded: boolean;
  align?: 'left' | 'center' | 'right';
  widthRatio?: number;
}

export const ALL_PDF_COLUMNS: ColumnDefinition[] = [
  { key: 'slNo', label: 'Sl. No.', defaultIncluded: true, align: 'center', widthRatio: 8 },
  { key: 'name', label: 'Village Name', defaultIncluded: true, align: 'left', widthRatio: 22 },
  { key: 'region', label: 'Region', defaultIncluded: true, align: 'center', widthRatio: 10 },
  { key: 'longphang', label: 'Longphang', defaultIncluded: true, align: 'center', widthRatio: 12 },
  { key: 'votes', label: 'No. of Votes', defaultIncluded: true, align: 'right', widthRatio: 12 },
  { key: 'president', label: 'President / Headman', defaultIncluded: true, align: 'left', widthRatio: 18 },
  { key: 'contactNo', label: 'Contact Number', defaultIncluded: true, align: 'left', widthRatio: 15 },
  { key: 'misc', label: 'Remarks / Notes', defaultIncluded: true, align: 'left', widthRatio: 20 },
  { key: 'updatedAt', label: 'Last Updated', defaultIncluded: false, align: 'center', widthRatio: 13 },
];

export interface DirectoryPDFExportOptions {
  title?: string;
  subtitle?: string;
  regionFilter?: RegionKey | 'all';
  orientation?: 'portrait' | 'landscape';
  columns?: PDFColumnKey[];
  includeSummaryStats?: boolean;
  filename?: string;
}

/**
 * Export a list of villages as a comprehensive, multi-page PDF document
 * with customizable columns and layout.
 */
export function exportDirectoryToPDF(
  villages: VillageRecord[],
  options: DirectoryPDFExportOptions = {}
): void {
  const {
    title = 'Tangkhul Village Directory',
    subtitle = 'Official Administrative & Electoral Records',
    regionFilter = 'all',
    orientation = 'landscape',
    columns = ['slNo', 'name', 'region', 'longphang', 'votes', 'president', 'contactNo', 'misc'],
    includeSummaryStats = true,
    filename,
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  // 1. Top Decorative Brand Banner
  doc.setFillColor(30, 64, 175); // Royal Blue #1e40af
  doc.rect(0, 0, pageWidth, 18, 'F');

  // Banner Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('TANGKHUL VILLAGE DIRECTORY', margin, 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    'OFFICIAL REGIONAL COUNCILS, ELECTORAL VOTES & SETTLEMENT ARCHIVE',
    margin,
    14
  );

  // Right-aligned header badge
  const generatedDateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  doc.setFontSize(8);
  doc.text(`Generated: ${generatedDateStr}`, pageWidth - margin, 9, { align: 'right' });
  doc.text(
    `Scope: ${regionFilter === 'all' ? 'All Regions (233 Total)' : `${regionFilter} Region`}`,
    pageWidth - margin,
    14,
    { align: 'right' }
  );

  let currentY = 24;

  // Document Title & Subtitle in Content Area
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(title, margin, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(subtitle, margin, currentY);
  currentY += 6;

  // 2. Summary Statistics Box (if requested)
  if (includeSummaryStats) {
    const totalVillages = villages.length;
    let totalVotes = 0;
    let recordedVotesCount = 0;
    const regionCounts: Record<RegionKey, number> = {
      North: 0,
      East: 0,
      West: 0,
      South: 0,
    };

    villages.forEach((v) => {
      if (v.votes !== null && v.votes !== undefined) {
        totalVotes += v.votes;
        recordedVotesCount++;
      }
      if (regionCounts[v.region] !== undefined) {
        regionCounts[v.region]++;
      }
    });

    const statBoxHeight = 16;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(margin, currentY, pageWidth - margin * 2, statBoxHeight, 2, 2, 'FD');

    const colWidth = (pageWidth - margin * 2) / 4;

    // Stat 1: Total Villages
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`${totalVillages} Villages`, margin + 5, currentY + 6.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Total Listed in Document', margin + 5, currentY + 11.5);

    // Stat 2: Total Recorded Votes
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 64, 175);
    doc.text(
      `${totalVotes.toLocaleString()} Votes`,
      margin + colWidth + 5,
      currentY + 6.5
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${recordedVotesCount} of ${totalVillages} villages recorded`,
      margin + colWidth + 5,
      currentY + 11.5
    );

    // Stat 3: Regional Breakdown
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `N: ${regionCounts.North} | E: ${regionCounts.East} | W: ${regionCounts.West} | S: ${regionCounts.South}`,
      margin + colWidth * 2 + 5,
      currentY + 6.5
    );
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('North, East, West, South Distribution', margin + colWidth * 2 + 5, currentY + 11.5);

    // Stat 4: Longphang Coverage
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Ato • Zingsho • Zingtun • Aze', margin + colWidth * 3 + 5, currentY + 6.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('4 Regional Council Jurisdictions', margin + colWidth * 3 + 5, currentY + 11.5);

    currentY += statBoxHeight + 5;
  }

  // 3. Prepare Table Headers & Data based on selected columns
  const activeColDefs = ALL_PDF_COLUMNS.filter((col) => columns.includes(col.key));
  const tableHeaders = activeColDefs.map((col) => col.label);

  const tableBody = villages.map((v, index) => {
    return activeColDefs.map((col) => {
      switch (col.key) {
        case 'slNo':
          return v.slNo !== undefined ? String(v.slNo) : String(index + 1);
        case 'name':
          return v.name || '—';
        case 'region':
          return v.region || '—';
        case 'longphang':
          return v.longphang || '—';
        case 'votes':
          return v.votes !== null && v.votes !== undefined
            ? v.votes.toLocaleString()
            : '—';
        case 'president':
          return v.president || '—';
        case 'contactNo':
          return v.contactNo || '—';
        case 'misc':
          return v.misc || '—';
        case 'updatedAt':
          return v.updatedAt ? v.updatedAt.slice(0, 10) : '—';
        default:
          return '';
      }
    });
  });

  // Calculate column alignment styles
  const columnStylesConfig: Record<number, any> = {};
  activeColDefs.forEach((col, idx) => {
    columnStylesConfig[idx] = {
      halign: col.align || 'left',
      fontStyle: col.key === 'name' ? 'bold' : 'normal',
    };
  });

  // 4. Generate AutoTable
  const autoTableOptions: UserOptions = {
    startY: currentY,
    head: [tableHeaders],
    body: tableBody,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2,
      lineColor: [226, 232, 240],
      lineWidth: 0.15,
      textColor: [30, 41, 59],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [30, 64, 175], // Deep Royal Blue
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    columnStyles: columnStylesConfig,
    margin: { left: margin, right: margin, top: 22, bottom: 14 },
    didDrawPage: (data) => {
      // Header for pages 2+
      if (data.pageNumber > 1) {
        doc.setFillColor(30, 64, 175);
        doc.rect(0, 0, pageWidth, 12, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Tangkhul Village Directory — Official Records', margin, 7.5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(
          `Page ${data.pageNumber}`,
          pageWidth - margin,
          7.5,
          { align: 'right' }
        );
      }

      // Footer on all pages
      const footerY = pageHeight - 6;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, footerY - 2, pageWidth - margin, footerY - 2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        'Tangkhul Village Directory PWA • Official Transcribed Dataset • Verified Offline Storage',
        margin,
        footerY
      );

      // Page numbers on right
      const totalPagesStr = String(doc.getNumberOfPages());
      doc.text(
        `Page ${data.pageNumber} of ${totalPagesStr}`,
        pageWidth - margin,
        footerY,
        { align: 'right' }
      );
    },
  };

  autoTable(doc, autoTableOptions);

  // 5. Trigger download
  const dateSlug = new Date().toISOString().slice(0, 10);
  const finalFilename =
    filename ||
    `tangkhul-village-directory-${regionFilter === 'all' ? 'all' : regionFilter.toLowerCase()}-${dateSlug}.pdf`;

  doc.save(finalFilename);
}

/**
 * Export an individual village record as a high-fidelity 1-page Official Data Sheet / Dossier PDF
 * containing every single particular data point with certificates and signature sections.
 */
export function exportSingleVillageToPDF(village: VillageRecord): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  // 1. Outer Decorative Archival Border
  doc.setDrawColor(30, 64, 175);
  doc.setLineWidth(0.8);
  doc.rect(margin - 4, margin - 4, contentWidth + 8, pageHeight - (margin - 4) * 2);

  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.rect(margin - 2.5, margin - 2.5, contentWidth + 5, pageHeight - (margin - 2.5) * 2);

  // 2. Official Header Top Banner
  doc.setFillColor(30, 64, 175);
  doc.roundedRect(margin, margin, contentWidth, 24, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('TANGKHUL VILLAGE DIRECTORY', pageWidth / 2, margin + 8.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    'OFFICIAL ADMINISTRATIVE SETTLEMENT DOSSIER & RECORD PROFILE',
    pageWidth / 2,
    margin + 14.5,
    { align: 'center' }
  );

  doc.setFontSize(7.5);
  doc.setTextColor(219, 234, 254); // blue-100
  doc.text(
    'Tangkhul Naga Autonomous Territorial & Cultural Jurisdiction',
    pageWidth / 2,
    margin + 19.5,
    { align: 'center' }
  );

  let y = margin + 31;

  // 3. Village Name & Hero Title Banner
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  const rawVillageName = (village.name || 'UNNAMED VILLAGE').trim().toUpperCase();
  const nameFontSize = rawVillageName.length > 28 ? 12.5 : rawVillageName.length > 20 ? 15 : 18;

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(nameFontSize);
  doc.text(rawVillageName, margin + 6, y + 9);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(
    `Official Reference: Sl. No. ${village.slNo || '—'}  •  Region: ${village.region}  •  Zone: ${village.longphang}`,
    margin + 6,
    y + 16
  );

  // Right-aligned status stamp badge in hero banner
  doc.setFillColor(30, 64, 175);
  doc.roundedRect(pageWidth - margin - 42, y + 4.5, 36, 14, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('OFFICIAL RECORD', pageWidth - margin - 24, y + 10.5, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('VERIFIED DATA', pageWidth - margin - 24, y + 14.5, { align: 'center' });

  y += 30;

  // 4. Section 1: Demographics & Electoral Data Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'FD');

  // Section Header
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 64, 175);
  doc.text('1. ELECTORAL & DEMOGRAPHIC PARTICULARS', margin + 4, y + 5.5);

  const s1ColWidth = contentWidth / 3;

  // Metric 1: Registered Votes
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('REGISTERED ELECTORAL VOTES', margin + 5, y + 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  const voteStr =
    village.votes !== null && village.votes !== undefined
      ? `${village.votes.toLocaleString()} Votes`
      : 'Unrecorded / Blank';
  doc.text(voteStr, margin + 5, y + 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    village.votes !== null ? 'Primary recorded voting strength' : 'Pending official enumeration',
    margin + 5,
    y + 28
  );

  // Metric 2: Longphang Jurisdiction
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('LONGPHANG JURISDICTION', margin + s1ColWidth + 5, y + 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(village.longphang || '—', margin + s1ColWidth + 5, y + 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Traditional territorial council zone', margin + s1ColWidth + 5, y + 28);

  // Metric 3: Regional Quadrant
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TERRITORIAL REGION', margin + s1ColWidth * 2 + 5, y + 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`${village.region} Quadrant`, margin + s1ColWidth * 2 + 5, y + 23);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('Tangkhul territorial administrative division', margin + s1ColWidth * 2 + 5, y + 28);

  y += 44;

  // 5. Section 2: Administrative Governance & Leadership Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 42, 2, 2, 'FD');

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 64, 175);
  doc.text('2. LOCAL LEADERSHIP & CONTACT PARTICULARS', margin + 4, y + 5.5);

  // President / Headman Particular
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Village President / Headman / Authorized Authority:', margin + 6, y + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(village.president || 'No President Recorded', margin + 6, y + 22);

  // Contact Telephone Particular
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Official Contact Telephone / Mobile:', margin + contentWidth / 2 + 4, y + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(village.contactNo ? 30 : 148, village.contactNo ? 64 : 163, village.contactNo ? 175 : 184);
  doc.text(village.contactNo || 'No Telephone Registered', margin + contentWidth / 2 + 4, y + 22);

  // Administration Details line
  doc.setDrawColor(241, 245, 249);
  doc.line(margin + 4, y + 27, pageWidth - margin - 4, y + 27);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Jurisdiction Body: Tangkhul Village Council (Pei/Authority)  •  Recognized Sl. No.: ${village.slNo}`,
    margin + 6,
    y + 35
  );

  y += 48;

  // 6. Section 3: Historical / Geographical Notes & Remarks Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 42, 2, 2, 'FD');

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 64, 175);
  doc.text('3. DESCRIPTIVE NOTES, GEOGRAPHY & MISCELLANEOUS PARTICULARS', margin + 4, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  const miscContent =
    village.misc && village.misc.trim().length > 0
      ? village.misc
      : 'No additional historical, clan, or geographical remarks recorded in primary directory transcription.';

  const splitNotes = doc.splitTextToSize(miscContent, contentWidth - 12);
  const maxNotesLines = 5;
  const displayedNotes =
    splitNotes.length > maxNotesLines
      ? [...splitNotes.slice(0, maxNotesLines - 1), splitNotes[maxNotesLines - 1] + '...']
      : splitNotes;
  doc.text(displayedNotes, margin + 6, y + 16);

  y += 48;

  // 7. Section 4: System Audit, Metadata & Record Authenticity Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, 'FD');

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 7, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 64, 175);
  doc.text('4. REPOSITORY AUDIT & RECORD IDENTIFIERS', margin + 4, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Unique Record ID: ${village.id}`, margin + 6, y + 13);
  doc.text(
    `Last Modification / Sync: ${new Date(village.updatedAt).toLocaleString()}`,
    margin + 6,
    y + 19
  );

  doc.text(
    `Export Date: ${new Date().toLocaleString()}`,
    margin + contentWidth / 2 + 4,
    y + 13
  );
  doc.text(
    'Data Origin: Tangkhul Village Directory Verified Dataset',
    margin + contentWidth / 2 + 4,
    y + 19
  );

  y += 32;

  // 8. Sign-off / Verification Seal Block
  const signBoxWidth = (contentWidth - 8) / 2;
  const signBoxHeight = 28;

  // Left Stamp Box
  doc.setDrawColor(203, 213, 225);
  doc.setLineDashPattern([1.5, 1], 0);
  doc.roundedRect(margin, y, signBoxWidth, signBoxHeight, 2, 2, 'D');
  doc.setLineDashPattern([], 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('OFFICIAL VERIFICATION EMBLEM / STAMP', margin + signBoxWidth / 2, y + 8, {
    align: 'center',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('[ Affix Village / Council Stamp Here ]', margin + signBoxWidth / 2, y + 16, {
    align: 'center',
  });

  // Right Signature Box
  doc.setDrawColor(203, 213, 225);
  doc.setLineDashPattern([1.5, 1], 0);
  doc.roundedRect(margin + signBoxWidth + 8, y, signBoxWidth, signBoxHeight, 2, 2, 'D');
  doc.setLineDashPattern([], 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('AUTHORIZED SIGNATORY & DATE', margin + signBoxWidth + 8 + signBoxWidth / 2, y + 8, {
    align: 'center',
  });

  doc.line(
    margin + signBoxWidth + 14,
    y + 20,
    margin + signBoxWidth + 8 + signBoxWidth - 6,
    y + 20
  );
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Village Headman / Council President / Secretary', margin + signBoxWidth + 8 + signBoxWidth / 2, y + 24, {
    align: 'center',
  });

  // 9. Document Footer Notice
  const footerY = pageHeight - margin + 1;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Tangkhul Village Directory PWA • Confidential & Official Archival Copy • Generated Offline from Local Repository',
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  // Trigger download
  const sanitizedName = village.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`village-${sanitizedName}-particulars-${dateSlug}.pdf`);
}
