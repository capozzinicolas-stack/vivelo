'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, FileSpreadsheet, FileText, FileDown } from 'lucide-react';
import { exportCSV, exportXLSX, exportPDF, type ExportColumn } from '@/lib/export';

interface ExportButtonProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  columns: ExportColumn[];
  filename: string;
  pdfTitle?: string;
}

export function ExportButton({ data, columns, filename, pdfTitle }: ExportButtonProps) {
  const [open, setOpen] = useState(false);

  if (data.length === 0) return null;

  const handle = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1">
        <button
          className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-sm hover:bg-muted transition-colors"
          onClick={() => handle(() => exportCSV(data, columns, filename))}
        >
          <FileText className="h-4 w-4" />
          CSV
        </button>
        <button
          className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-sm hover:bg-muted transition-colors"
          onClick={() => handle(() => exportXLSX(data, columns, filename))}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Excel (XLSX)
        </button>
        <button
          className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-sm hover:bg-muted transition-colors"
          onClick={() => handle(() => exportPDF(data, columns, filename, pdfTitle))}
        >
          <FileDown className="h-4 w-4" />
          PDF
        </button>
      </PopoverContent>
    </Popover>
  );
}
