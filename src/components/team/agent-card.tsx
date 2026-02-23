'use client';

import { Bot, Plus, MoreHorizontal, Clock, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Agent } from '@prisma/client';

interface AgentCardProps {
  agent: Agent & {
    assignedTasks?: Array<{
      id: string;
      title: string;
      status: string;
      createdAt: Date;
    }>;
    executedRuns?: Array<{
      id: string;
      status: string;
      startedAt: Date;
      completedAt?: Date;
    }>;
  };
  onEdit: (agent: Agent) => void;
  onDelete: (id: string) => void;
}

const statusColors = {
  idle: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    icon: '💤',
  },
  busy: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    icon: '🔵',
  },
  error: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    icon: '❌',
  },
  offline: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
    icon: '⚪',
  },
};

export function AgentCard({ agent, onEdit, onDelete }: AgentCardProps) {
  const config = agent.config as any;
  const role = config?.role || 'agent';
  const capabilities = config?.capabilities || [];
  const currentTask = agent.assignedTasks?.[0];

  const statusStyle = statusColors[agent.status as keyof typeof statusColors] || statusColors.idle;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={`h-12 w-12 rounded-full flex items-center justify-center text-2xl ${statusStyle.bg} ${statusStyle.border}`}>
            {statusStyle.icon}
          </div>

          {/* Name and Role */}
          <div>
            <h3 className="font-semibold text-gray-900">{agent.name}</h3>
            <span className="text-sm text-gray-500 capitalize">
              {role}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(agent)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Edit Agent"
          >
            <Plus className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </button>
          <button
            onClick={() => onDelete(agent.id)}
            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete Agent"
          >
            <MoreHorizontal className="h-4 w-4 text-gray-400 hover:text-red-600" />
          </button>
        </div>
      </div>

      {/* Status Badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-4 ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
        {statusStyle.icon}
        <span className="capitalize">{agent.status}</span>
      </div>

      {/* Capabilities */}
      {capabilities.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">
            Capabilities
          </p>
          <div className="flex flex-wrap gap-2">
            {capabilities.slice(0, 4).map((cap, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
              >
                {cap === 'code' && '💻'}
                {cap === 'review' && '👁'}
                {cap === 'debug' && '🐞'}
                {cap === 'test' && '🧪'}
                {cap === 'deploy' && '🚀'}
                <span className="capitalize">{cap}</span>
              </span>
            ))}
            {capabilities.length > 4 && (
              <span className="text-xs text-gray-400">+{capabilities.length - 4}</span>
            )}
          </div>
        </div>
      )}

      {/* Current Task */}
      {currentTask && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">
            Current Task
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm line-clamp-1">
                  {currentTask.title}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {currentTask.status.toLowerCase()} • {new Date(currentTask.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Runs */}
      {agent.executedRuns && agent.executedRuns.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">
            Recent Runs
          </p>
          <div className="space-y-2">
            {agent.executedRuns.slice(0, 3).map((run, index) => {
              const isSuccessful = run.status === 'SUCCESS';
              const isFailed = run.status === 'FAILED';
              const isRunning = run.status === 'RUNNING';

              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className={`p-1.5 rounded-full shrink-0 ${
                    isSuccessful ? 'bg-green-100 text-green-600' :
                    isFailed ? 'bg-red-100 text-red-600' :
                    isRunning ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {isSuccessful && <CheckCircle className="h-4 w-4" />}
                    {isFailed && <AlertCircle className="h-4 w-4" />}
                    {isRunning && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {run.status.replace('_', ' ').toLowerCase()}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {run.startedAt ? new Date(run.startedAt).toLocaleString() : 'Unknown'}
                    </p>
                    {run.completedAt && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Completed {Math.round((run.completedAt.getTime() - run.startedAt.getTime()) / 1000)}s ago
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            {agent.executedRuns.length > 3 && (
              <p className="text-xs text-gray-400 text-center mt-1">
                +{agent.executedRuns.length - 3} more runs
              </p>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>Created {new Date(agent.createdAt).toLocaleDateString()}</span>
        </div>
        {agent.updatedAt && agent.updatedAt !== agent.createdAt && (
          <span>Updated {new Date(agent.updatedAt).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}
