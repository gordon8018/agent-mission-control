import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageLayout } from '@/components/page-layout';
import { SwarmChecksPanel } from '@/components/swarm/swarm-checks-panel';
import { SwarmPRCard } from '@/components/swarm/swarm-pr-card';
import { SwarmRunStatusBadge } from '@/components/swarm/swarm-run-status-badge';
import { getSwarmRunById } from '@/lib/swarm/queries';
import { prisma } from '@/lib/prisma';

export default async function SwarmRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await getSwarmRunById(id);

  if (!run) {
    notFound();
  }
  const runTaskLink = await prisma.swarmRun.findUnique({
    where: { id },
    select: { taskId: true },
  });

  return (
    <PageLayout title={`Swarm Run ${run.id}`} currentPath="/swarm">
      <div className="mb-4 flex items-center gap-4">
        <Link href="/swarm" className="text-sm font-medium text-blue-700 hover:underline">← Back to Swarm</Link>
        {runTaskLink?.taskId && (
          <Link href={`/tasks?taskId=${runTaskLink.taskId}`} className="text-sm font-medium text-blue-700 hover:underline">
            View linked task
          </Link>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{run.name}</h3>
              <p className="text-sm text-gray-600">{run.summary}</p>
            </div>
            <SwarmRunStatusBadge status={run.status} />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Worktrees</h4>
              <ul className="mt-2 space-y-2 text-sm text-gray-700">
                {run.worktrees.map((worktree) => (
                  <li key={worktree.id} className="rounded-lg border border-gray-100 px-3 py-2">
                    <p className="font-medium">{worktree.branch}</p>
                    <p className="text-xs text-gray-500">{worktree.path}</p>
                    <p className="text-xs text-gray-500">Dirty: {worktree.dirty ? 'Yes' : 'No'}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900">Sessions</h4>
              <ul className="mt-2 space-y-2 text-sm text-gray-700">
                {run.sessions.map((session) => (
                  <li key={session.id} className="rounded-lg border border-gray-100 px-3 py-2">
                    <p className="font-medium">{session.name} · {session.agentName}</p>
                    <p className="text-xs text-gray-500">Status: {session.status}</p>
                    <p className="text-xs text-gray-500">Heartbeat: {new Date(session.lastHeartbeatAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {run.pr && <SwarmPRCard pr={run.pr} />}
          <SwarmChecksPanel checks={run.checks} />

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">Last Errors</h3>
            <div className="mt-2 space-y-2">
              {run.lastErrors.length === 0 && <p className="text-sm text-gray-500">No recent errors.</p>}
              {run.lastErrors.map((error) => (
                <div key={error.id} className="rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                  <p className="text-xs font-semibold text-red-800">{error.source}</p>
                  <p className="text-xs text-red-700">{error.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
