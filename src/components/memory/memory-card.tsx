'use client';

import { useState } from 'react';
import { MoreHorizontal, Edit, Trash2, Clock, Tag, BookOpen } from 'lucide-react';
import { Memory, MemorySource } from '@prisma/client';

interface MemoryCardProps {
  memory: Memory & {
    creator?: { id: string; name: string };
    sourceTask?: { id: string; title: string };
    sourceRun?: { id: string; eventId: string };
  };
  onEdit: (memory: any) => void;
  onDelete: (id: string) => void;
  onTagClick?: (tag: string) => void;
}

const sourceColors = {
  [MemorySource.MANUAL]: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
    icon: '✏️',
    label: 'Manual',
  },
  [MemorySource.TASK_DONE]: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    icon: '✅',
    label: 'Task Done',
  },
  [MemorySource.RUN_FINISHED]: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    icon: '🏃',
    label: 'Run Finished',
  },
};

export function MemoryCard({ memory, onEdit, onDelete, onTagClick }: MemoryCardProps) {
  const style = sourceColors[memory.source] || sourceColors[MemorySource.MANUAL];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium border ${style.bg} ${style.border} ${style.text}`}
            >
              {style.icon}
            </span>
            <span className="text-xs text-gray-500">
              {style.label}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 line-clamp-1">{memory.title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(memory)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
          <button
            onClick={() => onDelete(memory.id)}
            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-600" />
          </button>
        </div>
      </div>

      {/* Summary */}
      {memory.summary && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {memory.summary}
        </p>
      )}

      {/* Tags */}
      {memory.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {memory.tags.slice(0, 3).map((tag, index) => (
            <button
              key={index}
              onClick={() => onTagClick?.(tag)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              <Tag className="h-3 w-3" />
              {tag}
            </button>
          ))}
          {memory.tags.length > 3 && (
            <span className="text-xs text-gray-400">+{memory.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Source reference */}
      {memory.sourceTask && (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg mb-3">
          <BookOpen className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-700">
            From task: <span className="font-medium">{memory.sourceTask.title}</span>
          </span>
        </div>
      )}

      {memory.sourceRun && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg mb-3">
          <Clock className="h-4 w-4 text-blue-600" />
          <span className="text-sm text-blue-700">
            From run: <span className="font-medium">{memory.sourceRun.status}</span>
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>By {memory.creator?.name || 'Unknown'}</span>
        <span>{new Date(memory.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
