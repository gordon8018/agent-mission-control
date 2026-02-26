'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Clock, User, Bot, AlertCircle, Tag, MoreHorizontal, CheckCircle, Circle } from 'lucide-react';
import { Task } from '@prisma/client';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { formatDistanceToNowLocal } from '@/lib/utils';

interface TaskCardProps {
  task: Task & {
    column: { id: string; name: string; color?: string };
    assignedToUser?: { id: string; name: string };
    assignedToAgent?: { id: string; name: string };
    createdBy?: { id: string; name: string };
  };
  onClick: (task: any) => void;
}

const priorityColors = {
  [TaskPriority.LOW]: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
    icon: '○',
  },
  [TaskPriority.MEDIUM]: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    icon: '●',
  },
  [TaskPriority.HIGH]: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    border: 'border-orange-300',
    icon: '◉',
  },
  [TaskPriority.URGENT]: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    icon: '⚠',
  },
};

const statusIcons = {
  [TaskStatus.OPEN]: Circle,
  [TaskStatus.IN_PROGRESS]: Clock,
  [TaskStatus.DONE]: CheckCircle,
  [TaskStatus.BLOCKED]: AlertCircle,
};

export function TaskCard({ task, onClick }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const tags = (task.artifacts as any)?.tags || [];

  const StatusIcon = statusIcons[task.status as TaskStatus] || Circle;
  const priorityStyle = priorityColors[task.priority as TaskPriority] || priorityColors[TaskPriority.MEDIUM];

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onClick(task)}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-gray-300 transition-all ${
        isDragging ? 'opacity-50 rotate-2' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div
          className="flex items-center gap-2 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon className={`h-4 w-4 ${task.status === TaskStatus.DONE ? 'text-green-500' : 'text-gray-400'}`} />
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}
          >
            {priorityStyle.icon} {task.priority.toLowerCase()}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">{task.title}</h3>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tags.slice(0, 3).map((tag: string, index: number) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full"
            >
              <Tag className="h-3 w-3" />
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-xs text-gray-400">+{tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Description preview */}
      {task.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {task.description.replace(/[#*_`~\[\]]/g, '')}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        {/* Assignee */}
        {task.assignedToUser && (
          <div className="flex items-center gap-1.5" title={task.assignedToUser.name}>
            <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-3 w-3 text-blue-600" />
            </div>
            <span className="max-w-[100px] truncate">{task.assignedToUser.name}</span>
          </div>
        )}
        {task.assignedToAgent && (
          <div className="flex items-center gap-1.5" title={task.assignedToAgent.name}>
            <div className="h-5 w-5 rounded-full bg-purple-100 flex items-center justify-center">
              <Bot className="h-3 w-3 text-purple-600" />
            </div>
            <span className="max-w-[100px] truncate">{task.assignedToAgent.name}</span>
          </div>
        )}
        {!task.assignedToUser && !task.assignedToAgent && (
          <div className="flex items-center gap-1.5">
            <User className="h-4 w-4 text-gray-300" />
            <span className="text-gray-400">Unassigned</span>
          </div>
        )}

        {/* Due date */}
        {task.dueDate && (
          <div
            className={`flex items-center gap-1 ${
              isOverdue ? 'text-red-600 font-medium' : ''
            }`}
            title={task.dueDate.toLocaleString()}
          >
            <Clock className="h-3 w-3" />
            {isOverdue && <AlertCircle className="h-3 w-3" />}
            <span>{formatDistanceToNowLocal(new Date(task.dueDate), { addSuffix: true })}</span>
          </div>
        )}
      </div>
    </div>
  );
}
