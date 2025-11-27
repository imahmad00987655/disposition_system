'use client';

import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Printer, ChevronDown } from 'lucide-react';
import { Button } from './Button';
import { useToast } from './Toast';
import { exportToExcel, exportToPDF, printTable, prepareDataForExport } from '@/lib/export';
import { cn } from '@/lib/utils';

interface ExportMenuProps {
  data: any[];
  filename: string;
  title: string;
  columns: Array<{ header: string; dataKey: string }>;
  className?: string;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({
  data,
  filename,
  title,
  columns,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { showToast } = useToast();

  const handleExport = async (format: 'excel' | 'pdf' | 'print') => {
    try {
      const exportData = prepareDataForExport(data, columns.map(c => c.dataKey));
      
      let success = false;
      
      switch (format) {
        case 'excel':
          success = exportToExcel(exportData, filename, title);
          break;
        case 'pdf':
          success = exportToPDF(exportData, filename, title, columns);
          break;
        case 'print':
          success = printTable(exportData, title, columns);
          break;
      }
      
      if (success) {
        showToast('success', `Successfully exported as ${format.toUpperCase()}`);
      } else {
        showToast('error', `Failed to export as ${format.toUpperCase()}`);
      }
    } catch (error) {
      showToast('error', 'Export failed');
    }
    
    setIsOpen(false);
  };

  return (
    <div className={cn('relative', className)}>
      <Button
        variant="secondary"
        size="md"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Download className="w-4 h-4 mr-2" />
        Export
        <ChevronDown className={cn(
          'w-4 h-4 ml-2 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden">
            <div className="py-2">
              <button
                onClick={() => handleExport('excel')}
                className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
              >
                <FileSpreadsheet className="w-5 h-5 mr-3 text-green-600" />
                <div className="text-left">
                  <p className="font-semibold">Export to Excel</p>
                  <p className="text-xs text-gray-500">XLSX format</p>
                </div>
              </button>

              <button
                onClick={() => handleExport('pdf')}
                className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
              >
                <FileText className="w-5 h-5 mr-3 text-red-600" />
                <div className="text-left">
                  <p className="font-semibold">Export to PDF</p>
                  <p className="text-xs text-gray-500">PDF document</p>
                </div>
              </button>

              <button
                onClick={() => handleExport('print')}
                className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                <Printer className="w-5 h-5 mr-3 text-blue-600" />
                <div className="text-left">
                  <p className="font-semibold">Print</p>
                  <p className="text-xs text-gray-500">Print preview</p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

