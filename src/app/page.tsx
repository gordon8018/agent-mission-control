'use client';

import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { formatDistanceToNowLocal } from '@/lib/utils';
import { PageLayout } from '@/components/page-layout';

interface DashboardStats {
  totalTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  upcomingEvents: number;
  recentActivities: Array<{
    id: string;
    entityType: string;
    action: string;
    changes: any;
    performer: { name: string };
    createdAt: Date;
  }>;
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const actions = (
    <button
      onClick={fetchStats}
      disabled={isLoading}
      className="p-2 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
      title="Refresh"
    >
      <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
    </button>
  );

  return (
    <PageLayout title="Dashboard" currentPath="/" actions={actions}>
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : stats ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard title="Total Tasks" value={stats.totalTasks} />
            <StatCard title="In Progress" value={stats.inProgressTasks} />
            <StatCard title="Completed" value={stats.completedTasks} />
            <StatCard title="Upcoming Events" value={stats.upcomingEvents} />
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {stats.recentActivities.length > 0 ? (
                stats.recentActivities.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    action={activity.action}
                    description={getActivityDescription(activity)}
                    time={formatDistanceToNowLocal(new Date(activity.createdAt), { addSuffix: true })}
                    performer={activity.performer.name}
                  />
                ))
              ) : (
                <div className="text-center text-sm text-gray-400 py-8">
                  No recent activity
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center text-sm text-gray-400 py-8">
          Failed to load dashboard data
        </div>
      )}
    </PageLayout>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <p className="text-sm font-medium text-gray-600">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
    </div>
  );
}

function ActivityItem({
  action,
  description,
  time,
  performer,
}: {
  action: string;
  description: string;
  time: string;
  performer: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-2 w-2 mt-2 rounded-full bg-primary" />
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">
          <span className="text-gray-600">{performer}</span> {action}:{' '}
          <span className="text-gray-600">{description}</span>
        </p>
        <p className="text-xs text-gray-500 mt-1">{time}</p>
      </div>
    </div>
  );
}

function getActivityDescription(activity: DashboardStats['recentActivities'][0]) {
  const { entityType, changes } = activity;

  switch (entityType) {
    case 'task':
      if (activity.action === 'create') {
        return `Created task "${changes.title}"`;
      } else if (activity.action === 'move') {
        return `Moved task`;
      } else if (activity.action === 'update') {
        return `Updated task`;
      } else if (activity.action === 'delete') {
        return `Deleted task "${changes.title}"`;
      }
      break;
    case 'event':
      if (activity.action === 'run') {
        return `Executed event`;
      }
      break;
  }

  return `${activity.action} ${entityType}`;
}
