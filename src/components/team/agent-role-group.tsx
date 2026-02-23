'use client';

import { useState } from 'react';
import { Bot, Plus, MoreHorizontal, ChevronDown, ChevronUp } from 'lucide-react';
import { Agent } from '@prisma/client';
import { AgentCard } from './agent-card';

interface AgentRoleGroupProps {
  role: string;
  agents: Agent[];
  onCreateAgent: () => void;
  onEditAgent: (agent: Agent) => void;
  onDeleteAgent: (id: string) => void;
}

const roleIcons = {
  developer: { icon: '💻', label: 'Developers', color: 'bg-blue-100 text-blue-700' },
  reviewer: { icon: '👁', label: 'Reviewers', color: 'bg-purple-100 text-purple-700' },
  tester: { icon: '🧪', label: 'Testers', color: 'bg-green-100 text-green-700' },
  deployer: { icon: '🚀', label: 'Deployers', color: 'bg-orange-100 text-orange-700' },
  admin: { icon: '👑', label: 'Admins', color: 'bg-red-100 text-red-700' },
  agent: { icon: '🤖', label: 'Agents', color: 'bg-gray-100 text-gray-700' },
};

export function AgentRoleGroup({ role, agents, onCreateAgent, onEditAgent, onDeleteAgent }: AgentRoleGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const roleConfig = roleIcons[role as keyof typeof roleIcons] || roleIcons.agent;
  const busyCount = agents.filter(a => a.status === 'busy').length;
  const idleCount = agents.filter(a => a.status === 'idle').length;

  return (
    <div className="mb-6">
      {/* Header */}
      <div
        className={`flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-all ${
          isExpanded ? 'border-b-0 rounded-b-xl' : ''
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${roleConfig.color}`}>
            <span className="text-lg">{roleConfig.icon}</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{roleConfig.label}</h3>
            <p className="text-sm text-gray-500">
              {agents.length} agent{agents.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
              <span>{busyCount} busy</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
              <span>{idleCount} idle</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsCreateOpen(true);
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Create Agent"
          >
            <Plus className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCreateAgent();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Create Agent"
          >
            <Plus className="h-4 w-4 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Agents Grid (Expanded) */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 p-4 bg-gray-50 rounded-xl">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={onEditAgent}
              onDelete={onDeleteAgent}
            />
          ))}

          {agents.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Bot className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium mb-1">No agents in this role</p>
              <p className="text-sm text-gray-400">
                Click "Create Agent" to add your first agent
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
