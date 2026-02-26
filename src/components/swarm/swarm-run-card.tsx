import Link from 'next/link';
import { SwarmRun } from '@/lib/swarm/types';
import { SwarmRunStatusBadge } from '@/components/swarm/swarm-run-status-badge';

export function SwarmRunCard({ run }: { run: SwarmRun }) {
  const failedChecks = run.checks.filter((check) => check.status === 'FAILED').length;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{run.name}</p>
          <p className="text-xs text-gray-600">{run.repo}</p>
          <p className="mt-1 text-sm text-gray-700">{run.summary}</p>
        </div>
        <SwarmRunStatusBadge status={run.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
        <span>{run.worktrees.length} worktrees</span>
        <span>•</span>
        <span>{run.sessions.length} sessions</span>
        <span>•</span>
        <span>{run.checks.length} checks</span>
        {failedChecks > 0 && (
          <>
            <span>•</span>
            <span className="font-medium text-red-700">{failedChecks} failed</span>
          </>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <Link href={`/swarm/${run.id}`} className="text-sm font-medium text-blue-700 hover:underline">
          View details
        </Link>
      </div>
    </div>
  );
}
