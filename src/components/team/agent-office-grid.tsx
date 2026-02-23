'use client';

import { useState, useEffect } from 'react';
import { Bot, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react';
import { Agent } from '@prisma/client';

interface AgentOfficeGridProps {
  isOpen?: boolean;
  agents: Agent[];
  onAgentClick?: (agent: Agent) => void;
  onClose?: () => void;
}

export function AgentOfficeGrid({ isOpen = true, agents, onAgentClick, onClose }: AgentOfficeGridProps) {
  const [latestActivities, setLatestActivities] = useState<Map<string, string>>(new Map());

  // Poll for latest activities every 30 seconds
  useEffect(() => {
    const fetchLatestActivities = async () => {
      try {
        const promises = agents.slice(0, 9).map(async (agent) => {
          const res = await fetch(`/api/agents/${agent.id}?action=activities&limit=1`);
          const data = await res.json();
          return { agentId: agent.id, activity: data[0] };
        });

        const results = await Promise.all(promises);
        const activitiesMap = new Map(
          results
            .filter(r => r.activity)
            .map(r => [r.agentId, r.activity.action as string])
        );

        setLatestActivities(activitiesMap);
      } catch (error) {
        console.error('Failed to fetch latest activities:', error);
      }
    };

    fetchLatestActivities();
    const interval = setInterval(fetchLatestActivities, 30000);

    return () => clearInterval(interval);
  }, [agents]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'idle':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'busy':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'offline':
        return <X className="h-4 w-4 text-gray-400" />;
      default:
        return <Bot className="h-4 w-4 text-gray-400" />;
    }
  };

  const getActivityMessage = (action?: string) => {
    switch (action) {
      case 'create':
        return 'Created';
      case 'update':
        return 'Updated';
      case 'task_assigned':
        return 'Task assigned';
      case 'run_finished':
        return 'Run finished';
      case 'run_failed':
        return 'Run failed';
      case 'delete':
        return 'Deleted';
      default:
        return 'Active';
    }
  };

  return (
    <>
      {isOpen && (
        <div
          onClick={() => onClose && onClose()}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Agent Office</h2>
            <p className="text-sm text-gray-500">
              {agents.length} agent{agents.length !== 1 ? 's' : ''} • Real-time status
            </p>
          </div>
          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onClose();
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-6 w-6 text-gray-600" />
            </button>
          )}
        </div>

            {/* Agent Grid */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => onAgentClick?.(agent)}
                className={`bg-white rounded-xl p-6 shadow-sm hover:shadow-lg hover:shadow-blue-200 hover:scale-105 transition-all cursor-pointer border-2 ${
                  agent.status === 'busy' ? 'border-blue-200' :
                  agent.status === 'error' ? 'border-red-200' :
                  agent.status === 'offline' ? 'border-gray-300' :
                  'border-transparent'
                }`}
              >
                {/* Avatar */}
                <div className="flex justify-center mb-4">
                  <div
                    className={`h-20 w-20 rounded-full flex items-center justify-center text-3xl ${
                      agent.status === 'idle' ? 'bg-green-100' :
                      agent.status === 'busy' ? 'bg-blue-100 animate-pulse' :
                      agent.status === 'error' ? 'bg-red-100' :
                      'bg-gray-100'
                    }`}
                  >
                    {getStatusIcon(agent.status)}
                  </div>
                </div>

                {/* Name */}
                <div className="text-center mb-3">
                  <h3 className="font-semibold text-gray-900 text-lg">{agent.name}</h3>
                  <p className="text-xs text-gray-500 capitalize">{agent.status}</p>
                </div>

                {/* Latest Activity */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-2">
                    Latest Activity
                  </p>
                  {latestActivities.has(agent.id) ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {getActivityMessage(latestActivities.get(agent.id))}
                      </span>
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">No recent activity</span>
                      <Bot className="h-4 w-4 text-gray-300" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-gray-200">
          <div className="flex items-center justify-center text-xs text-gray-400">
            <span>Status updates every 30 seconds</span>
            <span>•</span>
            <span>Click an agent for details</span>
          </div>
        </div>
          </div>
        </div>
      )}
    </>
  );
}
