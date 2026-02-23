'use client';

import { useState } from 'react';
import { Bot, Plus, ChevronDown } from 'lucide-react';
import { Agent } from '@prisma/client';

interface QuickAssignToAgentProps {
  agents: Agent[];
  onAssign: (taskId: string, agentId: string) => void;
  disabled?: boolean;
}

export function QuickAssignToAgent({ agents, onAssign, disabled }: QuickAssignToAgentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const groupedAgents = agents.reduce((acc, agent) => {
    const role = (agent.config as any)?.role || 'agent';
    if (!acc[role]) acc[role] = [];
    acc[role].push(agent);
    return acc;
  }, {} as Record<string, typeof agents>);

  const handleAssign = (agentId: string) => {
    if (disabled) return;

    onAssign('current-task-id', agentId);
    setIsOpen(false);
    setSelectedAgentId(null);
  };

  if (!agents || agents.length === 0) {
    return null;
  }

  const availableAgents = agents.filter(a => a.status === 'idle' || a.status === 'busy');

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || availableAgents.length === 0}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
          disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : isOpen
            ? 'bg-blue-100 text-blue-700'
            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-blue-300'
        }`}
        title="Assign to agent"
      >
        <Bot className="h-4 w-4" />
        <span className="text-sm font-medium">Assign to Agent</span>
        {availableAgents.length > 0 && (
          <span className="text-xs text-gray-500">({availableAgents.length} available)</span>
        )}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Assign to Agent</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Agent List */}
          <div className="max-h-80 overflow-y-auto p-2">
            {availableAgents.length === 0 ? (
              <div className="text-center py-8">
                <Bot className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No Available Agents</p>
                <p className="text-sm text-gray-500">
                  Create an agent first or check agent status
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {availableAgents.map((agent) => {
                  const config = agent.config as any;
                  const role = config?.role || 'agent';
                  const isSelected = selectedAgentId === agent.id;

                  return (
                    <div
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-white border border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar with status */}
                        <div
                          className={`h-10 w-10 rounded-full flex items-center justify-center text-lg shrink-0 ${
                            agent.status === 'idle'
                              ? 'bg-green-100'
                              : agent.status === 'busy'
                              ? 'bg-blue-100'
                              : agent.status === 'error'
                              ? 'bg-red-100'
                              : 'bg-gray-100'
                          }`}
                        >
                          {agent.status === 'idle' && '💤'}
                          {agent.status === 'busy' && '🔵'}
                          {agent.status === 'error' && '❌'}
                          {agent.status === 'offline' && '⚪'}
                        </div>

                        {/* Name and Role */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 text-sm">
                              {agent.name}
                            </p>
                            <span
                              className={`inline-block ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                                role === 'developer'
                                  ? 'bg-blue-100 text-blue-700'
                                  : role === 'reviewer'
                                  ? 'bg-purple-100 text-purple-700'
                                  : role === 'tester'
                                  ? 'bg-green-100 text-green-700'
                                  : role === 'deployer'
                                  ? 'bg-orange-100 text-orange-700'
                                  : role === 'admin'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {role}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div
                        className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${
                          agent.status === 'idle'
                            ? 'bg-green-100 text-green-700'
                            : agent.status === 'busy'
                            ? 'bg-blue-100 text-blue-700'
                            : agent.status === 'error'
                            ? 'bg-red-100 text-red-700'
                            : agent.status === 'offline'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {agent.status}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-500 text-center">
              Agent will be assigned and status set to "busy"
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
