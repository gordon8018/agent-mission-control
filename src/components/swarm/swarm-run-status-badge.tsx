import { SwarmRunStatus } from '@/lib/swarm/types';

const statusClassMap: Record<SwarmRunStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  RUNNING: 'bg-blue-100 text-blue-800',
  SUCCESS: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

export function SwarmRunStatusBadge({ status }: { status: SwarmRunStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassMap[status]}`}>
      {status}
    </span>
  );
}
