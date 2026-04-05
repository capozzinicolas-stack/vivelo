'use client';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn {
  header: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  accessor: string | ((row: any) => string | number);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveValue(row: any, col: ExportColumn): string {
  if (typeof col.accessor === 'function') {
    return String(col.accessor(row) ?? '');
  }
  return String(row[col.accessor] ?? '');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildRows(data: any[], columns: ExportColumn[]): string[][] {
  return data.map(row => columns.map(col => resolveValue(row, col)));
}

// ── CSV ──────────────────────────────────────────────────────────────
export function exportCSV(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[],
  columns: ExportColumn[],
  filename: string,
) {
  const headers = columns.map(c => c.header);
  const rows = buildRows(data, columns);
  const csvContent = [headers, ...rows]
    .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  download(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

// ── XLSX ─────────────────────────────────────────────────────────────
export function exportXLSX(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[],
  columns: ExportColumn[],
  filename: string,
) {
  const headers = columns.map(c => c.header);
  const rows = buildRows(data, columns);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Auto-size columns
  ws['!cols'] = headers.map((h, i) => {
    const maxLen = Math.max(h.length, ...rows.map(r => String(r[i]).length));
    return { wch: Math.min(maxLen + 2, 50) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ── PDF ──────────────────────────────────────────────────────────────
export function exportPDF(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[],
  columns: ExportColumn[],
  filename: string,
  title?: string,
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  if (title) {
    doc.setFontSize(14);
    doc.text(title, 14, 15);
  }

  autoTable(doc, {
    head: [columns.map(c => c.header)],
    body: buildRows(data, columns),
    startY: title ? 22 : 10,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [88, 28, 135] }, // deep-purple
  });

  doc.save(`${filename}.pdf`);
}

// ── Helper ───────────────────────────────────────────────────────────
function download(content: string, filename: string, mime: string) {
  const blob = new Blob(['\uFEFF' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
