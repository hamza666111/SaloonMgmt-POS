"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "./dropdown-menu";
import { Button } from "./button";
import { Input } from "./input";
import { 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp, 
  MoreHorizontal,
  SlidersHorizontal,
  Download
} from "lucide-react";

export interface ColumnDef<T> {
  id: string; // Ensure id is string everywhere
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchKey?: keyof T;
  searchPlaceholder?: string;
  onRowClick?: (item: T) => void;
  actions?: (item: T) => React.ReactNode;
  exportable?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  searchKey,
  searchPlaceholder = "Search...",
  onRowClick,
  actions,
  exportable = false,
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: keyof T | null; direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'asc',
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    columns.reduce((acc, col) => ({ ...acc, [col.id as string]: true }), {})
  );

  // Sorting
  const sortedData = React.useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key!] < b[sortConfig.key!]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key!] > b[sortConfig.key!]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  // Filtering
  const filteredData = React.useMemo(() => {
    if (!searchQuery || !searchKey) return sortedData;
    const lowerQuery = searchQuery.toLowerCase();
    return sortedData.filter((item) => {
      const val = item[searchKey];
      return String(val).toLowerCase().includes(lowerQuery);
    });
  }, [sortedData, searchQuery, searchKey]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const requestSort = (key: keyof T) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const exportCSV = () => {
    const headers = columns.filter(col => visibleColumns[col.id]).map(c => c.header).join(',');
    const rows = filteredData.map(item => 
      columns.filter(col => visibleColumns[col.id]).map(col => {
        const val = col.accessorKey ? item[col.accessorKey] : '';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',')
    ).join('\n');
    
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        {searchKey && (
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="max-w-sm bg-black/20 border-white/10 text-white placeholder:text-gray-500"
          />
        )}
        <div className="flex items-center gap-2">
          {exportable && (
            <Button variant="outline" size="sm" onClick={exportCSV} className="border-white/10 text-white hover:bg-white/10">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/10">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-white/10 text-white">
              {columns.map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={visibleColumns[column.id]}
                  onCheckedChange={(value) =>
                    setVisibleColumns({ ...visibleColumns, [column.id]: value })
                  }
                >
                  {column.header}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/10 bg-[#161616] overflow-hidden">
        <Table>
          <TableHeader className="bg-black/40 hover:bg-black/40">
            <TableRow className="border-white/10 hover:bg-transparent">
              {columns.map(
                (col) =>
                  visibleColumns[col.id] && (
                    <TableHead key={col.id} className="text-gray-400 font-medium">
                      {col.sortable && col.accessorKey ? (
                        <div
                          className="flex items-center cursor-pointer hover:text-white transition-colors select-none"
                          onClick={() => requestSort(col.accessorKey!)}
                        >
                          {col.header}
                          <span className="ml-2 flex-col flex space-y-[-0.3rem]">
                            <ChevronUp className={`h-3 w-3 ${sortConfig.key === col.accessorKey && sortConfig.direction === 'asc' ? 'text-white' : 'text-gray-600'}`} />
                            <ChevronDown className={`h-3 w-3 ${sortConfig.key === col.accessorKey && sortConfig.direction === 'desc' ? 'text-white' : 'text-gray-600'}`} />
                          </span>
                        </div>
                      ) : (
                        col.header
                      )}
                    </TableHead>
                  )
              )}
              {actions && <TableHead className="text-right text-gray-400">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, i) => (
                <TableRow
                  key={i}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`border-white/10 transition-colors ${onRowClick ? "cursor-pointer hover:bg-white/[0.02]" : ""}`}
                >
                  {columns.map(
                    (col) =>
                      visibleColumns[col.id] && (
                        <TableCell key={col.id} className="text-white">
                          {col.cell ? col.cell(row) : col.accessorKey ? String(row[col.accessorKey]) : ""}
                        </TableCell>
                      )
                  )}
                  {actions && (
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-white/10 text-white">
                          {actions(row)}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + (actions ? 1 : 0)} className="h-24 text-center text-gray-500">
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <div>
          Showing {(currentPage - 1) * rowsPerPage + 1} to{" "}
          {Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length} entries
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="border-white/10 bg-transparent hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="border-white/10 bg-transparent hover:bg-white/10"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
