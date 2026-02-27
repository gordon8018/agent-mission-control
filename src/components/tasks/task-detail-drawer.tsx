'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { X, Save, Trash2, Plus, FileText, Calendar, Tag, User, Bot, Clock, CheckCircle, Circle, AlertCircle, Play } from 'lucide-react';
import { Task, TaskPriority, TaskStatus } from '@prisma/client';

interface TaskDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task & {
    column: { id: string; name: string; color?: string };
    assignedToUser?: { id: string; name: string; email?: string };
    assignedToAgent?: { id: string; name: string; status?: string };
    createdBy?: { id: string; name: string };
    swarmRuns?: Array<{
      id: string;
      runType: 'FEATURE' | 'BUGFIX' | 'TEST' | 'DEPLOY' | 'REVIEW';
      status: 'PENDING' | 'RUNNING' | 'RETRY_REQUESTED' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
      createdAt: string | Date;
    }>;
  };
  onUpdate: (id: string, data: any) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function TaskDetailDrawer({ isOpen, onClose, task, onUpdate, onDelete }: TaskDetailDrawerProps) {
  // Early return if drawer is closed or task is null
  if (!isOpen || !task) return null;

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(
    task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [mcAgents, setMcAgents] = useState<Array<{ id: string; name: string; openclawAgentId: string | null; openclawLinkStatus: string }>>([]);
  const [selectedMcAgentId, setSelectedMcAgentId] = useState('');
  const [manualOpenClawAgentId, setManualOpenClawAgentId] = useState('');
  const [isStartingSwarm, setIsStartingSwarm] = useState(false);
  const [swarmMessage, setSwarmMessage] = useState<string | null>(null);
  const [latestSwarmRunId, setLatestSwarmRunId] = useState<string | null>(null);
  const [swarmError, setSwarmError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    void fetch('/api/agents')
      .then((res) => res.json())
      .then((agents) => {
        if (!Array.isArray(agents)) return;
        setMcAgents(
          agents.map((agent) => ({
            id: agent.id,
            name: agent.name,
            openclawAgentId: agent.openclawAgentId ?? null,
            openclawLinkStatus: agent.openclawLinkStatus ?? 'UNLINKED',
          }))
        );
      })
      .catch((error) => {
        console.error('Failed to load MC agents for swarm start:', error);
      });
  }, [isOpen]);

  const tags = (task.artifacts as any)?.tags || [];
  const artifacts = (task.artifacts as any)?.artifacts || [];

  const stageSwarmConfig = useMemo(() => {
    if (task.taskType !== 'DEV') return null;

    if (task.column.name === 'In Test') {
      return { buttonLabel: 'Start Swarm Test Run', runType: 'test' as const };
    }

    if (task.column.name === 'In Deploy') {
      return { buttonLabel: 'Start Swarm Deploy Run', runType: 'deploy' as const };
    }

    return null;
  }, [task.column.name, task.taskType]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(task.id, {
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this task?')) {
      await onDelete(task.id);
      onClose();
    }
  };

  const handleStartSwarm = async () => {
    if (!stageSwarmConfig) {
      setSwarmError('Swarm runs can only be started in In Test or In Deploy for dev tasks.');
      return;
    }
    setSwarmMessage(null);
    setLatestSwarmRunId(null);
    setSwarmError(null);

    const selectedAgent = mcAgents.find((agent) => agent.id === selectedMcAgentId);
    const hasMappedAgent = Boolean(selectedAgent?.openclawAgentId?.trim());
    const manualInput = manualOpenClawAgentId.trim();

    if (!hasMappedAgent && !manualInput) {
      setSwarmError('No OpenClaw mapping selected. Choose an MC Agent with a link or enter an OpenClaw agent id.');
      return;
    }

    setIsStartingSwarm(true);
    try {
      const response = await fetch('/api/swarm/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          mcAgentId: selectedMcAgentId || undefined,
          openclawAgentId: manualInput || undefined,
          runType: stageSwarmConfig?.runType,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setSwarmError(result.error || 'Failed to start swarm run.');
        return;
      }

      if (result.blocked) {
        setSwarmError(result.blockReason || 'Swarm run is blocked due to missing OpenClaw mapping.');
      } else {
        setLatestSwarmRunId(result.runId);
        setSwarmMessage(`Swarm ${result.runType?.toLowerCase?.() || stageSwarmConfig?.runType || 'run'} started with OpenClaw agent ${result.orchestratorAgentId}.`);
      }
    } catch (error) {
      console.error('Failed to start swarm run:', error);
      setSwarmError('Failed to start swarm run.');
    } finally {
      setIsStartingSwarm(false);
    }
  };

  const statusIcons = {
    [TaskStatus.OPEN]: Circle,
    [TaskStatus.IN_PROGRESS]: Clock,
    [TaskStatus.DONE]: CheckCircle,
    [TaskStatus.BLOCKED]: AlertCircle,
  };

  const StatusIcon = statusIcons[task.status] || Circle;

  return (
    <div className={`fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl transform transition-transform z-50 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div className="flex-1">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-semibold text-gray-900 bg-transparent border-none outline-none w-full"
            placeholder="Task title"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Save"
          >
            <Save className={`h-5 w-5 text-gray-600 ${isSaving ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Status and Priority */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
            <StatusIcon className={`h-5 w-5 ${task.status === TaskStatus.DONE ? 'text-green-500' : 'text-gray-500'}`} />
            <span className="text-sm font-medium capitalize">{task.status.replace('_', ' ')}</span>
          </div>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
            className="px-3 py-2 bg-gray-50 rounded-lg border-0 text-sm font-medium focus:ring-2 focus:ring-blue-500"
          >
            <option value={TaskPriority.LOW}>○ Low</option>
            <option value={TaskPriority.MEDIUM}>● Medium</option>
            <option value={TaskPriority.HIGH}>◉ High</option>
            <option value={TaskPriority.URGENT}>⚠ Urgent</option>
          </select>
          {task.dueDate && (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add task description..."
            rows={8}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="mt-2 flex gap-2 text-xs text-gray-400">
            <span>**bold**</span>
            <span>*italic*</span>
            <span>`code`</span>
            <span>- list</span>
            <span># heading</span>
          </div>
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Due Date
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-full"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No tags</p>
          )}
        </div>

        {/* Assignee */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assignee
          </label>
          {task.assignedToUser && (
            <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 rounded-lg">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{task.assignedToUser.name}</p>
                <p className="text-xs text-gray-500">{task.assignedToUser.email}</p>
              </div>
            </div>
          )}
          {task.assignedToAgent && (
            <div className="flex items-center gap-2 px-4 py-3 bg-purple-50 rounded-lg">
              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Bot className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{task.assignedToAgent.name}</p>
                <p className="text-xs text-gray-500 capitalize">{task.assignedToAgent.status}</p>
              </div>
            </div>
          )}
          {!task.assignedToUser && !task.assignedToAgent && (
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg text-gray-400">
              <User className="h-5 w-5" />
              <span>Unassigned</span>
            </div>
          )}
        </div>

        {/* Column */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Column
          </label>
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-lg">
            {task.column.color && (
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: task.column.color }}
              />
            )}
            <span className="font-medium text-gray-900">{task.column.name}</span>
          </div>
        </div>

        {/* Artifacts */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Artifacts
            </label>
            <button className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
          {artifacts.length > 0 ? (
            <div className="space-y-2">
              {artifacts.map((artifact: any, index: number) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{artifact.name || 'Untitled'}</p>
                    <p className="text-xs text-gray-500">{artifact.type}</p>
                  </div>
                  <p className="text-xs text-gray-400">
                    {new Date(artifact.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No artifacts</p>
          )}
        </div>

        {/* Metadata */}
        {stageSwarmConfig && (
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Swarm Orchestrator</label>
            <button
              onClick={handleStartSwarm}
              disabled={isStartingSwarm}
              className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isStartingSwarm ? 'Starting...' : stageSwarmConfig.buttonLabel}
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Select an MC Agent mapping (many MC Agents can point to one OpenClaw id) or enter an OpenClaw id directly.
          </p>

          <label className="block text-xs font-medium text-gray-600 mb-1">MC Agent</label>
          <select
            value={selectedMcAgentId}
            onChange={(e) => setSelectedMcAgentId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">No MC Agent selected</option>
            {mcAgents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} — {agent.openclawLinkStatus} {agent.openclawAgentId ? `(${agent.openclawAgentId})` : '(no OpenClaw ID)'}
              </option>
            ))}
          </select>

          <label className="block text-xs font-medium text-gray-600 mt-3 mb-1">OpenClaw Agent ID (override)</label>
          <input
            type="text"
            value={manualOpenClawAgentId}
            onChange={(e) => setManualOpenClawAgentId(e.target.value)}
            placeholder="oc-agent-123"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {swarmMessage && (
            <p className="mt-3 text-sm text-green-600">
              {swarmMessage}{' '}
              {latestSwarmRunId && (
                <Link href={`/swarm/${latestSwarmRunId}`} className="underline">
                  View run
                </Link>
              )}
            </p>
          )}
          {swarmError && <p className="mt-3 text-sm text-red-600">{swarmError}</p>}

          {task.swarmRuns && task.swarmRuns.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-600 mb-2">Recent swarm runs</p>
              <div className="space-y-2">
                {task.swarmRuns.map((run) => (
                  <Link key={run.id} href={`/swarm/${run.id}`} className="block text-xs text-indigo-700 hover:underline">
                    {run.runType} · {run.status} · {new Date(run.createdAt).toLocaleString()}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
        )}

        <div className="pt-4 border-t">
          <p className="text-xs text-gray-400">
            Created {task.createdAt ? new Date(task.createdAt).toLocaleString() : 'Unknown'} by {task.createdBy?.name || 'Unknown'}
          </p>
          {task.updatedAt && task.updatedAt !== task.createdAt && (
            <p className="text-xs text-gray-400 mt-1">
              Updated {new Date(task.updatedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-6 border-t bg-gray-50">
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Delete Task
        </button>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
