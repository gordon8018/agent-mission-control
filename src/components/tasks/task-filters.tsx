'use client';

import { useState } from 'react';
import { Filter, X, ChevronDown, Calendar, User, Tag, MoreHorizontal } from 'lucide-react';
import { TaskPriority, TaskStatus } from '@prisma/client';

interface TaskFiltersProps {
  onFiltersChange: (filters: any) => void;
}

export function TaskFilters({ onFiltersChange }: TaskFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assigneeType: '',
    due: '',
  });

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      status: '',
      priority: '',
      assigneeType: '',
      due: '',
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== '');

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
          hasActiveFilters
            ? 'bg-blue-100 text-blue-700'
            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
        }`}
      >
        <Filter className="h-4 w-4" />
        <span className="text-sm font-medium">Filters</span>
        {hasActiveFilters && (
          <span className="h-2 w-2 bg-blue-600 rounded-full" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-10 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-gray-900">Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear all
              </button>
            )}
          </div>

          {/* Filter Options */}
          <div className="p-4 space-y-4">
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">All</option>
                <option value={TaskStatus.OPEN}>Open</option>
                <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                <option value={TaskStatus.DONE}>Done</option>
                <option value={TaskStatus.BLOCKED}>Blocked</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">All</option>
                <option value={TaskPriority.URGENT}>Urgent</option>
                <option value={TaskPriority.HIGH}>High</option>
                <option value={TaskPriority.MEDIUM}>Medium</option>
                <option value={TaskPriority.LOW}>Low</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <select
                value={filters.due}
                onChange={(e) => handleFilterChange('due', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">All</option>
                <option value="overdue">Overdue</option>
                <option value="today">Due Today</option>
                <option value="week">Due This Week</option>
                <option value="month">Due This Month</option>
              </select>
            </div>

            {/* Assignee Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assignee Type
              </label>
              <select
                value={filters.assigneeType}
                onChange={(e) => handleFilterChange('assigneeType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">All</option>
                <option value="user">Assigned to User</option>
                <option value="agent">Assigned to Agent</option>
                <option value="none">Unassigned</option>
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t bg-gray-50">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
