'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, Copy, Search } from 'lucide-react';
import { Button } from './Button';
import { ExportMenu } from './ExportMenu';
import { cn } from '@/lib/utils';
import { globalSearch, columnFilter, copyToClipboard } from '@/lib/utils';

interface Column<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  enableSorting?: boolean;
  enableColumnFilter?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  exportable?: boolean;
  exportFilename?: string;
  rowsPerPageOptions?: number[];
  onRowClick?: (row: T) => void;
  expandableRow?: (row: T) => React.ReactNode;
  getRowId?: (row: T) => string;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchable = true,
  searchPlaceholder = 'Search...',
  exportable = true,
  exportFilename = 'export',
  rowsPerPageOptions = [5, 10, 15, 25, 50],
  onRowClick,
  expandableRow,
  getRowId = (row) => row.id,
  className,
}: DataTableProps<T>) {
  const [searchInput, setSearchInput] = useState('');
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[1]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(columns.map(col => col.id))
  );

  const handleSearch = () => {
    setGlobalFilter(searchInput);
    setCurrentPage(0); // Reset to first page on search
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Filter data
  const filteredData = useMemo(() => {
    let filtered = data;

    // Apply global search
    if (globalFilter) {
      filtered = globalSearch(filtered, globalFilter);
    }

    // Apply column filters
    Object.entries(columnFilters).forEach(([columnId, filterValue]) => {
      if (filterValue) {
        const column = columns.find(col => col.id === columnId);
        if (column?.accessorKey) {
          filtered = columnFilter(filtered, column.accessorKey as string, filterValue);
        }
      }
    });

    // Apply sorting
    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue === bValue) return 0;
        
        const comparison = aValue < bValue ? -1 : 1;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, globalFilter, columnFilters, sortConfig, columns]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = currentPage * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);

  const handleSort = (columnId: string) => {
    const column = columns.find(col => col.id === columnId);
    if (!column?.enableSorting && column?.enableSorting !== undefined && !column.enableSorting) return;

    setSortConfig(current => {
      if (!current || current.key !== columnId) {
        return { key: columnId, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { key: columnId, direction: 'desc' };
      }
      return null;
    });
  };

  const handleCopy = () => {
    const exportColumns = columns
      .filter(col => visibleColumns.has(col.id))
      .map(col => col.accessorKey as string)
      .filter(Boolean);

    copyToClipboard(filteredData, exportColumns).then(success => {
      if (success) {
        alert('Copied to clipboard!');
      }
    });
  };

  const getExportColumns = () => {
    return columns
      .filter(col => visibleColumns.has(col.id) && col.accessorKey)
      .map(col => ({
        header: col.header,
        dataKey: col.accessorKey as string,
      }));
  };

  const toggleRowExpansion = (rowId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set<string>();
      // If the clicked row is already expanded, close it
      if (prev.has(rowId)) {
        return newSet; // Return empty set to close all
      } else {
        // Close all others and open only this one
        newSet.add(rowId);
        return newSet;
      }
    });
  };

  const toggleColumnVisibility = (columnId: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        newSet.delete(columnId);
      } else {
        newSet.add(columnId);
      }
      return newSet;
    });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        {searchable && (
          <div className="flex gap-2 w-full sm:w-96">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 outline-none"
                placeholder={searchPlaceholder}
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSearch}
              className="px-6"
            >
              Search
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          {exportable && (
            <>
              <ExportMenu
                data={filteredData}
                filename={exportFilename}
                title={exportFilename.replace(/-/g, ' ').toUpperCase()}
                columns={getExportColumns()}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="min-w-full">
          <thead>
            <tr>
              {expandableRow && (
                <th className="w-12"></th>
              )}
              {columns.filter(col => visibleColumns.has(col.id)).map((column) => (
                <th
                  key={column.id}
                  className={cn(
                    'px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider',
                    column.enableSorting !== false && 'cursor-pointer select-none hover:bg-purple-100'
                  )}
                  style={{ width: column.width }}
                  onClick={() => column.enableSorting !== false && handleSort(column.accessorKey as string || column.id)}
                >
                  <div className="flex items-center justify-between">
                    <span>{column.header}</span>
                    {column.enableSorting !== false && (
                      <span className="ml-2">
                        {sortConfig?.key === (column.accessorKey as string || column.id) ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-4 h-4 text-gray-400" />
                        )}
                      </span>
                    )}
                  </div>
                  {column.enableColumnFilter && (
                    <input
                      type="text"
                      className="mt-2 w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-purple-500 focus:border-transparent"
                      placeholder={`Filter ${column.header}...`}
                      value={columnFilters[column.id] || ''}
                      onChange={(e) => {
                        e.stopPropagation();
                        setColumnFilters(prev => ({
                          ...prev,
                          [column.id]: e.target.value
                        }));
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (expandableRow ? 1 : 0)}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  <div className="flex flex-col items-center">
                    <p className="text-lg font-semibold mb-2">No data found</p>
                    <p className="text-sm">Try adjusting your search or filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => {
                const rowId = getRowId(row);
                const isExpanded = expandedRows.has(rowId);

                return (
                  <React.Fragment key={rowId}>
                    <tr
                      className={cn(
                        'transition-all duration-200 hover:bg-purple-50',
                        onRowClick && 'cursor-pointer'
                      )}
                      onClick={() => onRowClick?.(row)}
                    >
                      {expandableRow && (
                        <td className="px-3 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRowExpansion(rowId);
                            }}
                            className="text-purple-600 hover:text-purple-800 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                      )}
                      {columns.filter(col => visibleColumns.has(col.id)).map((column) => (
                        <td key={column.id} className="px-3 py-3 text-sm text-gray-900">
                          {column.cell
                            ? column.cell(row)
                            : column.accessorKey
                            ? row[column.accessorKey]
                            : null}
                        </td>
                      ))}
                    </tr>
                    {expandableRow && isExpanded && (
                      <tr>
                        <td
                          colSpan={columns.length + 1}
                          className="px-3 py-3 bg-gray-50 border-t border-gray-200"
                        >
                          <div className="animate-accordion-down">
                            {expandableRow(row)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700">Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(0);
            }}
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            {rowsPerPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="text-sm text-gray-700">
          Showing {currentPage * rowsPerPage + 1} to{' '}
          {Math.min((currentPage + 1) * rowsPerPage, filteredData.length)} of{' '}
          {filteredData.length} entries
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(0)}
            disabled={currentPage === 0}
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm">
            Page {currentPage + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage >= totalPages - 1}
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(totalPages - 1)}
            disabled={currentPage >= totalPages - 1}
          >
            Last
          </Button>
        </div>
      </div>
    </div>
  );
}

