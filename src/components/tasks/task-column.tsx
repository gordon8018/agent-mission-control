'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { TaskCard } from './task-card';
import { TaskColumn as TaskColumnType } from '@prisma/client';

interface TaskColumnProps {
  column: TaskColumnType & {
    tasks: any[];
  };
  onCreateTask: (columnId: string) => void;
  onTaskClick: (task: any) => void;
}

export function TaskColumnComponent({ column, onCreateTask, onTaskClick }: TaskColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  return (
    <div className="flex-shrink-0 w-80 bg-gray-50 rounded-lg p-3">
      {/* Column header */}
      <div
        className="flex items-center justify-between mb-3 px-1"
        style={{ borderBottomColor: column.color || '#3b82f6' }}
      >
        <div className="flex items-center gap-2">
          {column.color && (
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: column.color }}
            />
          )}
          <h3 className="font-semibold text-gray-900 text-sm">{column.name}</h3>
          <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
            {column.tasks.length}
          </span>
        </div>
        <button
          onClick={() => onCreateTask(column.id)}
          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
          title="Create task"
        >
          <Plus className="h-4 w-4 text-gray-600 hover:text-gray-900" />
        </button>
      </div>

      {/* Task list */}
      <SortableContext
        id={column.id}
        items={column.tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className="space-y-3 min-h-[200px]"
        >
          {column.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={onTaskClick}
            />
          ))}
          {column.tasks.length === 0 && (
            <div className="text-center text-sm text-gray-400 py-10 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="font-medium">No tasks</p>
              <p className="text-xs mt-1">Drag tasks here or create one</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
