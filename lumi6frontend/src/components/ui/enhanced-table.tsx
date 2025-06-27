import { useState, useMemo, ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, Filter, RefreshCw, Download, Eye, MoreHorizontal } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { Button } from './button';
import { Input } from './input';
import { Badge } from './badge';
import { SkeletonTable } from './skeleton-card';
import { cn } from '@/lib/utils';
import { TableProps, TableColumn } from '@/types/common';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';

interface EnhancedTableProps<T = any> extends TableProps<T> {
  caption?: string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  selectedRows?: string[];
  onRowSelect?: (id: string, selected: boolean) => void;
  selectable?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  bulkActions?: Array<{
    label: string;
    icon?: ReactNode;
    onClick: (selectedIds: string[]) => void;
    variant?: 'default' | 'destructive';
  }>;
  showTableActions?: boolean;
  isRefreshing?: boolean;
  density?: 'compact' | 'normal' | 'comfortable';
}

export const EnhancedTable = <T extends { id: string }>({
  data,
  columns,
  loading = false,
  caption,
  emptyMessage = 'No data available',
  pagination,
  onPageChange,
  onSort,
  onRowClick,
  selectedRows = [],
  onRowSelect,
  selectable = false,
  searchable = false,
  searchPlaceholder = 'Search...',
  onSearch,
  onRefresh,
  onExport,
  bulkActions = [],
  showTableActions = true,
  isRefreshing = false,
  density = 'normal',
  className,
}: EnhancedTableProps<T>) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSort = (columnKey: string, sortable?: boolean) => {
    if (!sortable) return;

    const newDirection = sortColumn === columnKey && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortColumn(columnKey);
    setSortDirection(newDirection);
    onSort?.(columnKey, newDirection);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const getSortIcon = (columnKey: string, sortable?: boolean) => {
    if (!sortable) return null;

    if (sortColumn !== columnKey) {
      return <ChevronsUpDown className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }

    return sortDirection === 'asc' 
      ? <ChevronUp className="h-4 w-4 text-blue-600" />
      : <ChevronDown className="h-4 w-4 text-blue-600" />;
  };

  const isAllSelected = data.length > 0 && selectedRows.length === data.length;
  const isIndeterminate = selectedRows.length > 0 && selectedRows.length < data.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      data.forEach(item => onRowSelect?.(item.id, false));
    } else {
      data.forEach(item => {
        if (!selectedRows.includes(item.id)) {
          onRowSelect?.(item.id, true);
        }
      });
    }
  };

  const densityClasses = {
    compact: 'py-1 px-2',
    normal: 'py-2 px-3',
    comfortable: 'py-3 px-4'
  };

  if (loading) {
    return (
      <div className={cn('bg-white rounded-lg shadow-sm border', className)}>
        {showTableActions && (
          <div className="border-b p-4">
            <div className="flex items-center justify-between">
              <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
              <div className="flex gap-2">
                <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
              </div>
            </div>
          </div>
        )}
        <SkeletonTable rows={5} columns={columns.length + (selectable ? 1 : 0)} />
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-lg shadow-sm border overflow-hidden w-full', className)}>
      {/* Table Actions Header */}
      {showTableActions && (
        <div className="border-b bg-gray-50/50 p-4 lg:p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              {searchable && (
                <div className="relative min-w-[200px] lg:min-w-[300px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
              )}
              
              {selectedRows.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {selectedRows.length} selected
                  </Badge>
                  {bulkActions.map((action, index) => (
                    <Button
                      key={index}
                      variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
                      size="sm"
                      onClick={() => action.onClick(selectedRows)}
                      className="flex items-center gap-1"
                    >
                      {action.icon}
                      <span className="hidden sm:inline">{action.label}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              )}
              
              {onExport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExport}
                  className="flex items-center gap-1"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table Container with Enhanced Responsive Styling */}
      <div className="overflow-x-auto w-full">
        <div className="min-w-full">
          <Table className="w-full table-auto">
            {caption && <caption className="sr-only">{caption}</caption>}
            
            <TableHeader>
              <TableRow className="bg-gray-50/80 hover:bg-gray-50">
                {selectable && (
                  <TableHead className="w-12 lg:w-16 sticky-header">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = isIndeterminate;
                      }}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 focus:ring-blue-500 focus:ring-2"
                      aria-label="Select all rows"
                    />
                  </TableHead>
                )}
                
                {columns.map((column) => (
                  <TableHead 
                    key={String(column.key)}
                    className={cn(
                      'sticky-header font-semibold text-gray-700 group',
                      column.sortable && 'cursor-pointer hover:bg-gray-100 transition-colors',
                      column.className || (column.width
                    )}
                    onClick={() => handleSort(String(column.key), column.sortable)}
                    role={column.sortable ? 'button' : undefined}
                    tabIndex={column.sortable ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (column.sortable && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleSort(String(column.key), column.sortable);
                      }
                    }}
                    aria-sort={
                      column.sortable && sortColumn === String(column.key)
                        ? sortDirection === 'asc' ? 'ascending' : 'descending'
                        : undefined
                    }
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs lg:text-sm xl:text-base">{column.label}</span>
                      {getSortIcon(String(column.key), column.sortable)}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={columns.length + (selectable ? 1 : 0)} 
                    className="text-center py-12 lg:py-16"
                  >
                    <div className="flex flex-col items-center gap-3 text-gray-500">
                      <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gray-100 rounded-full flex items-center justify-center">
                        <Search className="h-8 w-8 lg:h-10 lg:w-10 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-700 text-sm lg:text-base">{emptyMessage}</p>
                        <p className="text-sm lg:text-base">Try adjusting your search or filters</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item, index) => {
                  const isSelected = selectedRows.includes(item.id);
                  
                  return (
                    <TableRow
                      key={item.id}
                      className={cn(
                        'transition-all duration-150 border-b border-gray-100',
                        onRowClick && 'cursor-pointer hover:bg-blue-50/50 hover:shadow-sm',
                        isSelected && 'bg-blue-50 ring-1 ring-blue-200',
                        'group'
                      )}
                      onClick={() => onRowClick?.(item)}
                      role={onRowClick ? 'button' : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          onRowClick(item);
                        }
                      }}
                      aria-rowindex={index + 2}
                    >
                      {selectable && (
                        <TableCell className={cn(densityClasses[density], 'w-12 lg:w-16')}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              onRowSelect?.(item.id, e.target.checked);
                            }}
                            className="rounded border-gray-300 focus:ring-blue-500 focus:ring-2"
                            aria-label={`Select row ${index + 1}`}
                          />
                        </TableCell>
                      )}
                      
                      {columns.map((column) => (
                        <TableCell 
                          key={String(column.key)}
                          className={cn(
                            densityClasses[density],
                            'transition-colors group-hover:bg-blue-50/30',
                            column.className // Use responsive className
                          )}
                        >
                          {column.render 
                            ? column.render(item[column.key], item)
                            : String(item[column.key] || '')
                          }
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Enhanced Pagination - responsive */}
      {pagination && (
        <div className="flex items-center justify-between px-4 lg:px-6 py-4 border-t bg-gray-50/50 flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-sm lg:text-base text-gray-700">
              Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
              <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.totalCount)}</span> of{' '}
              <span className="font-medium">{pagination.totalCount}</span> results
            </div>
            
            {selectedRows.length > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {selectedRows.length} selected
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              aria-label="Go to previous page"
              className="flex items-center gap-1"
            >
              <ChevronUp className="h-4 w-4 rotate-[-90deg]" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-700">Page</span>
              <Badge variant="outline" className="bg-white">
                {pagination.page}
              </Badge>
              <span className="text-sm text-gray-700">of {pagination.totalPages}</span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={!pagination.hasNext}
              aria-label="Go to next page"
              className="flex items-center gap-1"
            >
              Next
              <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}; 