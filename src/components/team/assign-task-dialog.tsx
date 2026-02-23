'use client';

import { useState } from 'react';
import { X, Search, Bot, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Agent, Task } from '@prisma/client';

interface AssignTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (task: Task, agentId: string) => Promise<void>;
  agents: Agent[];
  currentAgentId?: string;
}

export function AssignTaskDialog({ isOpen, onClose, onAssign, agents, currentAgentId }: AssignTaskDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (agent.config as any)?.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAssign = async (agentId: string) => {
    if (isAssigning) return;

    setIsAssigning(true);
    try {
      await onAssign(agents[0], agentId);
      setSelectedAgentId(null);
      setSearchQuery('');
      onClose();
    } catch (error) {
      console.error('Failed to assign task:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  if (!isOpen) return null;

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Bot className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Assign Task</h2>
              <p className="text-sm text-gray-500">
                {selectedAgent
                  ? `Selected: ${selectedAgent.name}`
                  : `Select an agent to assign this task`
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Agents List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredAgents.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No agents found</p>
              <p className="text-sm text-gray-400">Try a different search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAgents.map((agent) => {
                const config = agent.config as any;
                const role = config?.role || 'agent';
                const capabilities = config?.capabilities || [];
                const isSelected = selectedAgentId === agent.id;
                const isCurrent = agent.id === currentAgentId;

                return (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgentId(agent.id)}
                    disabled={isAssigning}
                    className={`text-left p-6 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500'
                        : isCurrent
                        ? 'bg-green-50 border-green-500'
                        : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div
                        className={`h-14 w-14 rounded-full flex items-center justify-center text-2xl shrink-0 ${
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

                      {/* Agent Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">{agent.name}</h3>
                            <span className={`inline-block ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                              role === 'developer' && 'bg-blue-100 text-blue-700'
                            } ${role === 'reviewer' && 'bg-purple-100 text-purple-700'
                            } ${role === 'tester' && 'bg-green-100 text-green-700'
                            } ${role === 'deployer' && 'bg-orange-100 text-orange-700'
                            } ${role === 'admin' && 'bg-red-100 text-red-700'
                            } ${role === 'agent' && 'bg-gray-100 text-gray-700'
                            }`}>
                              {role}
                            </span>
                          </div>
                        </div>

                        {/* Status */}
                        {agent.status !== 'offline' && (
                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            agent.status === 'idle' && 'bg-green-100 text-green-700'
                          } ${agent.status === 'busy' && 'bg-blue-100 text-blue-700'
                          } ${agent.status === 'error' && 'bg-red-100 text-red-700'
                          }`}>
                            {agent.status === 'idle' && 'Available'}
                            {agent.status === 'busy' && 'Busy'}
                            {agent.status === 'error' && 'Error'}
                            {isSelected && (
                              <CheckCircle className="h-3 w-3 ml-1" />
                            )}
                          </div>
                        )}
                        {isSelected && !agent.status && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            Offline
                          </div>
                        )}
                      </div>

                      {/* Action */}
                      {isSelected && (
                        <CheckCircle className="h-5 w-5 text-blue-600 mt-1" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {filteredAgents.length} agent{filteredAgents.length !== 1 ? 's' : ''} found
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              type="button"
              className="px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => selectedAgentId && handleAssign(selectedAgentId)}
              type="button"
              disabled={!selectedAgentId || isAssigning}
              className="px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isAssigning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Assign Task
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
