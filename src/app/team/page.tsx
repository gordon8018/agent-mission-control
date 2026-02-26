'use client';

import { useEffect, useState } from 'react';
import { Plus, Users, Building2, X, Search, Filter, Link2, Unlink2, CheckCircle2 } from 'lucide-react';
import { PageLayout } from '@/components/page-layout';
import { AgentCard } from '@/components/team/agent-card';
import { AgentRoleGroup } from '@/components/team/agent-role-group';
import { AgentOfficeGrid } from '@/components/team/agent-office-grid';
import { CreateAgentDialog } from '@/components/team/create-agent-dialog';
import { AssignTaskDialog } from '@/components/team/assign-task-dialog';
import {
  createAgent,
  updateAgent,
  deleteAgent,
  quickAssignTask,
  linkOpenClawAgent,
  unlinkOpenClawAgent,
  validateOpenClawAgentLink,
  listOpenClawAgents,
} from './actions';

const PERFORMED_BY = 'admin-user-placeholder';

const openClawLinkStatusLabels: Record<string, string> = {
  LINKED: 'Linked',
  UNLINKED: 'Unlinked',
  INVALID: 'Invalid',
  UNKNOWN: 'Unknown',
};

export default function TeamPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'team' | 'office'>('team');
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOfficeOpen, setIsOfficeOpen] = useState(false);
  const [openclawAgentIdInput, setOpenclawAgentIdInput] = useState('');
  const [openclawOptions, setOpenclawOptions] = useState<Array<{ id: string; name?: string }>>([]);
  const [isOpenClawModalOpen, setIsOpenClawModalOpen] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    if (!selectedAgent) return;
    const refreshed = agents.find((agent) => agent.id === selectedAgent.id);
    if (refreshed) {
      setSelectedAgent(refreshed);
      setOpenclawAgentIdInput(refreshed.openclawAgentId || '');
    }
  }, [agents, selectedAgent?.id]);

  const fetchAgents = async () => {
    setIsLoading(true);
    try {
      const data = await fetch('/api/agents').then((r) => r.json());
      setAgents(data);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAgent = async (data: any) => {
    await createAgent({
      ...data,
      createdBy: PERFORMED_BY,
    });
    await fetchAgents();
  };

  const handleUpdateAgent = async (id: string, data: any) => {
    await updateAgent(id, data, PERFORMED_BY);
    await fetchAgents();
  };

  const handleDeleteAgent = async (id: string) => {
    if (confirm('Are you sure you want to delete this agent?')) {
      await deleteAgent(id, PERFORMED_BY);
      await fetchAgents();
    }
  };

  const handleAssignTask = async (taskId: string, agentId: string) => {
    await quickAssignTask(taskId, agentId, PERFORMED_BY);
    await fetchAgents(); // Refresh agents to show updated status
  };

  const handleEditAgent = (agent: any) => {
    setSelectedAgent(agent);
    setOpenclawAgentIdInput(agent.openclawAgentId || '');
  };

  const handleLinkOpenClaw = async () => {
    if (!selectedAgent) return;
    setIsLinking(true);
    try {
      await linkOpenClawAgent(selectedAgent.id, openclawAgentIdInput, PERFORMED_BY, true);
      await fetchAgents();
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkOpenClaw = async () => {
    if (!selectedAgent) return;
    setIsLinking(true);
    try {
      await unlinkOpenClawAgent(selectedAgent.id, PERFORMED_BY);
      setOpenclawAgentIdInput('');
      await fetchAgents();
    } finally {
      setIsLinking(false);
    }
  };

  const handleValidateOpenClaw = async () => {
    if (!selectedAgent) return;
    setIsLinking(true);
    try {
      await validateOpenClawAgentLink(selectedAgent.id, PERFORMED_BY);
      await fetchAgents();
    } finally {
      setIsLinking(false);
    }
  };

  const handleListOpenClaw = async () => {
    const options = await listOpenClawAgents(PERFORMED_BY);
    setOpenclawOptions(options);
    setIsOpenClawModalOpen(true);
  };

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (agent.config as any)?.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const availableAgents = agents.filter(a => a.status === 'idle' || a.status === 'busy');

  const groupedAgents = agents.reduce((acc, agent) => {
    const role = (agent.config as any)?.role || 'agent';
    if (!acc[role]) {
      acc[role] = [];
    }
    acc[role].push(agent);
    return acc;
  }, {} as Record<string, typeof agents>);

  const alsoLinkedAgents = selectedAgent?.openclawAgentId
    ? agents.filter((agent) => agent.id !== selectedAgent.id && agent.openclawAgentId === selectedAgent.openclawAgentId)
    : [];

  const actions = (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
        <Search className="h-4 w-4 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search agents..."
          className="bg-transparent border-0 text-sm focus:outline-none w-32"
        />
      </div>

      <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
        <Filter className="h-4 w-4 text-gray-500" />
        <select
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as any)}
          className="bg-transparent border-0 text-sm focus:outline-none font-medium text-gray-700"
        >
          <option value="team">Team View</option>
          <option value="office">Office View</option>
        </select>
      </div>

      <button
        onClick={() => setIsOfficeOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Building2 className="h-4 w-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Office</span>
      </button>

      <button
        onClick={() => {
          setSelectedAgent(null);
          setIsCreateOpen(true);
        }}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus className="h-5 w-5" />
        <span className="text-sm font-medium">Create Agent</span>
      </button>
    </div>
  );

  return (
    <>
      <PageLayout title="Team" currentPath="/team" actions={actions}>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading agents...</div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Header */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{agents.length}</p>
                    <p className="text-sm text-gray-500">Total Agents</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <span className="text-green-700 font-bold">{agents.filter(a => a.status === 'idle').length}</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{agents.filter(a => a.status === 'idle').length}</p>
                    <p className="text-sm text-gray-500">Idle</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-700 font-bold">{agents.filter(a => a.status === 'busy').length}</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{agents.filter(a => a.status === 'busy').length}</p>
                    <p className="text-sm text-gray-500">Busy</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Team View */}
            {viewMode === 'team' && (
              <div className="space-y-6">
                {Object.entries(groupedAgents).map(([role, roleAgents]) => {
                  if (roleAgents.length === 0) return null;

                  return (
                    <AgentRoleGroup
                      key={role}
                      role={role}
                      agents={roleAgents}
                      onCreateAgent={() => {
                        setSelectedAgent(null);
                        setIsCreateOpen(true);
                      }}
                      onEditAgent={handleEditAgent}
                      onDeleteAgent={handleDeleteAgent}
                    />
                  );
                })}
              </div>
            )}

            {/* Office View - Trigger Modal */}
            {viewMode === 'office' && (
              <div className="text-center py-12">
                <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium mb-2">Office View</p>
                <p className="text-sm text-gray-500 mb-6">
                  Click the "Office" button above to open the Agent Office modal
                </p>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredAgents.length === 0 && (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium mb-2">No agents found</p>
                <p className="text-sm text-gray-500 mb-6">
                  Click "Create Agent" to add your first AI team member
                </p>
                <button
                  onClick={() => {
                    setSelectedAgent(null);
                    setIsCreateOpen(true);
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Create Your First Agent
                </button>
              </div>
            )}
          </div>
        )}
      </PageLayout>

      {/* Create Agent Dialog */}
      <CreateAgentDialog
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setSelectedAgent(null);
        }}
        onCreate={handleCreateAgent}
      />

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white z-10 border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedAgent.name}</h2>
                    <p className="text-sm text-gray-500 capitalize">
                      {(selectedAgent.config as any)?.role || 'Agent'} • {selectedAgent.status}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      OpenClaw: {openClawLinkStatusLabels[selectedAgent.openclawLinkStatus || 'UNLINKED']}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Agent Card */}
              <AgentCard
                agent={selectedAgent}
                onEdit={handleEditAgent}
                onDelete={handleDeleteAgent}
              />

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setSelectedAgent(null);
                    setIsCreateOpen(true);
                  }}
                  className="flex items-center gap-3 px-6 py-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-all"
                >
                  <Plus className="h-5 w-5 text-gray-600" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Edit Agent</p>
                    <p className="text-sm text-gray-500">Update configuration</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    handleDeleteAgent(selectedAgent.id);
                    setSelectedAgent(null);
                  }}
                  className="flex items-center gap-3 px-6 py-4 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-all"
                >
                  <div className="h-5 w-5 flex items-center justify-center bg-red-200 text-red-600 rounded-full">
                    ✕
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-red-900">Delete Agent</p>
                    <p className="text-sm text-red-600">Remove this agent</p>
                  </div>
                </button>
              </div>

              {/* Configuration */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Role</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {(selectedAgent.config as any)?.role || 'Agent'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Status</p>
                    <p className="font-medium text-gray-900 capitalize">
                      {selectedAgent.status}
                    </p>
                  </div>
                </div>
                {(selectedAgent.config as any)?.capabilities && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-2">Capabilities</p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedAgent.config as any).capabilities.map((cap: string, index: number) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm"
                        >
                          {cap === 'code' && '💻'}
                          {cap === 'review' && '👁'}
                          {cap === 'debug' && '🐛'}
                          {cap === 'test' && '🧪'}
                          {cap === 'deploy' && '🚀'}
                          {cap === 'monitor' && '📊'}
                          {cap === 'documentation' && '📝'}
                          <span className="capitalize">{cap}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">OpenClaw Link</h3>
                <div>
                  <p className="text-sm text-gray-500 mb-2">OpenClaw Agent ID</p>
                  <div className="flex items-center gap-2">
                    <input
                      value={openclawAgentIdInput}
                      onChange={(e) => setOpenclawAgentIdInput(e.target.value)}
                      placeholder="oc-agent-123"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <button
                      onClick={handleLinkOpenClaw}
                      disabled={isLinking || !openclawAgentIdInput.trim()}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                    >
                      <Link2 className="h-4 w-4" />
                      Link
                    </button>
                    <button
                      onClick={handleListOpenClaw}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      Select from OpenClaw...
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleValidateOpenClaw}
                    disabled={isLinking || !selectedAgent.openclawAgentId}
                    className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Validate
                  </button>
                  <button
                    onClick={handleUnlinkOpenClaw}
                    disabled={isLinking || !selectedAgent.openclawAgentId}
                    className="inline-flex items-center gap-2 px-3 py-2 border border-red-200 text-red-700 rounded-lg text-sm disabled:opacity-50"
                  >
                    <Unlink2 className="h-4 w-4" />
                    Unlink
                  </button>
                </div>

                {selectedAgent.openclawAgentId && (
                  <div className="text-sm text-gray-600">
                    Current Link: <span className="font-mono">{selectedAgent.openclawAgentId}</span> ({openClawLinkStatusLabels[selectedAgent.openclawLinkStatus || 'UNKNOWN']})
                  </div>
                )}
              </div>

              {selectedAgent.openclawAgentId && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Also linked by</h3>
                  {alsoLinkedAgents.length === 0 ? (
                    <p className="text-sm text-gray-500">No other Mission Control agents use this OpenClaw Agent ID.</p>
                  ) : (
                    <div className="space-y-2">
                      {alsoLinkedAgents.map((agent) => (
                        <div key={agent.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
                          <span className="font-medium text-gray-900">{agent.name}</span>
                          <span className="text-gray-500">{openClawLinkStatusLabels[agent.openclawLinkStatus || 'UNKNOWN']}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isOpenClawModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md max-h-[70vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Select OpenClaw Agent</h3>
              <button onClick={() => setIsOpenClawModalOpen(false)} className="text-sm text-gray-500">Close</button>
            </div>
            <div className="p-4 space-y-2">
              {openclawOptions.length === 0 ? (
                <p className="text-sm text-gray-500">No OpenClaw agents available from list endpoint.</p>
              ) : (
                openclawOptions.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => {
                      setOpenclawAgentIdInput(agent.id);
                      setIsOpenClawModalOpen(false);
                    }}
                    className="w-full text-left border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50"
                  >
                    <p className="font-medium text-gray-900">{agent.name || agent.id}</p>
                    <p className="text-xs text-gray-500 font-mono">{agent.id}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assign Task Dialog */}
      <AssignTaskDialog
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        onAssign={handleAssignTask}
        agents={availableAgents}
        currentAgentId={null}
      />

      {/* Office Modal */}
      <AgentOfficeGrid
        isOpen={isOfficeOpen}
        agents={agents}
        onAgentClick={(agent) => setSelectedAgent(agent)}
        onClose={() => setIsOfficeOpen(false)}
      />
    </>
  );
}
