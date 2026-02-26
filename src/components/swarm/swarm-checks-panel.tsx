import { SwarmCheck } from '@/lib/swarm/types';

const checkStatusClassMap: Record<SwarmCheck['status'], string> = {
  PENDING: 'text-amber-700',
  RUNNING: 'text-blue-700',
  PASSED: 'text-emerald-700',
  FAILED: 'text-red-700',
  SKIPPED: 'text-gray-600',
};

export function SwarmChecksPanel({ checks }: { checks: SwarmCheck[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900">Checks</h3>
      <div className="mt-3 space-y-2">
        {checks.length === 0 && <p className="text-sm text-gray-500">No checks reported yet.</p>}
        {checks.map((check) => (
          <div key={check.id} className="rounded-lg border border-gray-100 px-3 py-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900">{check.name}</p>
              <span className={`text-xs font-semibold ${checkStatusClassMap[check.status]}`}>{check.status}</span>
            </div>
            <p className="text-xs text-gray-500">{check.provider}</p>
            {check.details && <p className="mt-1 text-xs text-gray-600">{check.details}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
