import Link from 'next/link';
import { SwarmPRInfo } from '@/lib/swarm/types';

export function SwarmPRCard({ pr }: { pr: SwarmPRInfo }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">PR #{pr.number}</p>
          <p className="text-sm text-gray-700">{pr.title}</p>
          <p className="text-xs text-gray-500">{pr.repo} · {pr.branch}</p>
        </div>
        {pr.queuePosition !== undefined && (
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
            Queue #{pr.queuePosition}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-gray-600">Author: {pr.author}</p>
        <Link href={pr.url} className="text-xs font-medium text-blue-700 hover:underline" target="_blank">
          View PR
        </Link>
      </div>
    </div>
  );
}
